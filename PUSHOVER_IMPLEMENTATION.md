# Pushover Implementation — Full Technical Detail

## What It Actually Is

Pushover is **not a web push / service worker system**. There is no subscription, no
`pushManager`, no VAPID key, no `service-worker.js` anywhere in this codebase.

It is a **simple outbound HTTPS POST from the server to the Pushover REST API**, which then
delivers a push notification to Terry's phone via the Pushover mobile app. One recipient, one
hardcoded device, no opt-in, no user browser involved.

```
Visitor browser
   │  POST /api/chat { message, history }
   ▼
Vercel Edge Middleware  ── rate limit (trusted IP, 20 req/min)
   ▼
api/chat.py (Python serverless fn)
   │  LLM returns tool_calls: record_user_details
   ▼
validate_contact_email()   ── deterministic guard
   ▼
push_notification()  ── POST https://api.pushover.net/1/messages.json
   ▼
Terry's phone (Pushover app)  ── <5s
```

---

## The Function (api/chat.py lines 134-157)

```python
def push_notification(text: str, priority: int = 0):
    """Send Pushover notification"""
    try:
        token = os.environ.get("PUSHOVER_TOKEN")
        user = os.environ.get("PUSHOVER_USER")

        if not token or not user:
            print("Pushover not configured")
            return False

        resp = requests.post(
            "https://api.pushover.net/1/messages.json",
            data={
                "token": token,
                "user": user,
                "message": text[:1000],
                "priority": priority,
            },
            timeout=5
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"Push error: {e}")
        return False
```

**Design characteristics worth carrying over:**
- Never raises — every failure path returns `False` and logs. A Pushover outage cannot break the chat.
- `timeout=5` — hard cap so a slow Pushover doesn't hold the visitor's HTTP response open.
- `text[:1000]` — Pushover's message limit is 1024 chars; truncates rather than 400s.
- Returns bool, not response body — caller ignores it anyway.
- Runs **inline inside the tool-call loop**, not on a background queue.

---

## Environment Variables (2 only)

```bash
PUSHOVER_TOKEN=your_application_token    # from pushover.net/apps/build
PUSHOVER_USER=your_user_key              # from pushover.net/account
```

| Var | Where it comes from | Exposure risk |
|-----|--------------------|---------------|
| `PUSHOVER_TOKEN` | Pushover app registration | **Must be server-only.** Anyone with it can spam your phone. |
| `PUSHOVER_USER` | Pushover account dashboard | Low sensitivity but keep it server-side anyway. |

> **Critical nuance:** in the current Vercel setup, `api/chat.py` is a Python function running
> server-side, so these never reach the client. If you move the push call into anything that
> bundles to the browser — a React `onClick`, a Next.js `"use client"` component, or a Cloudflare
> Pages Function inlined into your app — **you will leak the token**. Keep it in the Worker only.

---

## The Two Call Sites (api/chat.py lines 293-302)

```python
# record_user_details — after validation passes
push_notification(
    f"📬 New Contact!\n\nName: {name}\nEmail: {email}\nNotes: {notes}",
    priority=1
)
output = {"success": True, "message": "Contact details sent to Terry!"}

# record_unknown_question — no validation
push_notification(f"❓ Unknown question:\n{question[:500]}")
output = {"success": True}
```

| Call | Priority | Validated | Volume risk |
|------|----------|-----------|-------------|
| New contact | `1` (high — bypasses quiet hours) | Yes, email guard | Low — requires real email in corpus |
| Unknown question | `0` (normal) | No | **Medium** — easy for a visitor to trigger repeatedly |

---

## The Guard That Makes It Safe (api/chat.py lines 228-253)

This is the single most important piece. Without it the chatbot spams Terry's phone with
fabricated contacts.

```python
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PLACEHOLDER_EMAIL_PARTS = (
    "example.com", "example.org", "example.net", "test.com",
    "email.com", "domain.com", "yourname", "placeholder", "noreply",
)

def validate_contact_email(email: str, user_corpus: str) -> tuple:
    email = (email or "").strip()
    if not EMAIL_RE.match(email):
        return False, "not a valid email format"

    lowered = email.lower()
    if any(part in lowered for part in PLACEHOLDER_EMAIL_PARTS):
        return False, "looks like a placeholder/example email"

    # The model must echo back an email the visitor actually typed.
    if lowered not in user_corpus:
        return False, "email was not provided by the user in this conversation"

    return True, ""
```

**The corpus is built in `chat_with_model` (lines 394-396):**
```python
user_corpus = " ".join(
    m["content"] for m in messages if m.get("role") == "user"
).lower()
```

`messages` = `[system prompt] + sanitized_history + [current message]`. So the corpus covers
**every user turn in the conversation**, including all history the client sent.

**Rejection path returns a tool error, not a user-facing error (lines 279-291):**
```python
results.append({
    "role": "tool",
    "tool_call_id": call_id,
    "content": json.dumps({
        "success": False,
        "error": (
            f"The email '{email}' is invalid ({reason}). "
            "Do not invent an email. Ask the user to type their "
            "real email address, then try again."
        ),
    })
})
```
The model sees this and re-asks the visitor. The visitor never learns about the guard.

### Why this exists — the documented failure
From the Digital Twin project data:
> "The chatbot invented placeholder emails (e.g. terrystartup@example.com) and submitted them
> as real contact details, triggering false Pushover notifications."

### Known weaknesses in the current guard (fix these in the new build)
1. **Substring match is bidirectional.** `lowered not in user_corpus` means an email of `"a@b.co"`
   passes if that string appears *anywhere* in the corpus, including inside a URL.
2. **Placeholder list is brittle.** It catches `example.com` but not `gmail.con`, `gmial.com`,
   `mailinator.com`, or a fully fabricated realistic address like `j.smith@northwind.io`.
3. **No rate limit on pushes.** A visitor can call `record_unknown_question` 20 times/min
   (edge limit) and fill the phone.
4. **No dedup.** Same contact can be pushed repeatedly across sessions.
5. **`unknown_question` has no validation at all** — the 500-char slice is the only bound.

---

## Tool-Calling Loop (api/chat.py lines 411-440)

```python
for iteration in range(SECURITY_CONFIG["max_tool_iterations"]):   # max 3
    request_kwargs = {
        "model": model,
        "messages": messages,
        "tools": TOOLS,
        "max_tokens": SECURITY_CONFIG["max_tokens_per_response"],  # 360
        "temperature": 0.4,
    }
    if extra_body:
        request_kwargs["extra_body"] = extra_body

    response = client.chat.completions.create(**request_kwargs)
    choice = response.choices[0]

    if choice.finish_reason == "tool_calls":
        tool_calls = choice.message.tool_calls or []
        if not tool_calls:
            return choice.message.content or "Could you share the best email address..."

        last_tool_calls = tool_calls
        tool_results = handle_tool_call(tool_calls, user_corpus)
        messages.append(assistant_message_with_tools(choice.message))
        messages.extend(tool_results)
        continue

    return choice.message.content or "I'm not sure how to respond to that."

return "I'm having trouble processing that. Could you try rephrasing?"
```

**Why max 3:** a model can loop `record_user_details → fail → record_user_details → ...`. Three
iterations gives one retry to the model (iteration 1 = tool call, iteration 2 = retry, iteration 3
= final answer) then falls through to a generic message.

**`fallback_tool_reply` (lines 338-348)** — used when the whole loop throws after a tool call was
already attempted, so the visitor doesn't get a dead-end:
```python
def fallback_tool_reply(tool_calls) -> str:
    names = [...]
    if "record_user_details" in names:
        return "Thanks, I have the details. I'll make sure Terry gets this and can follow up."
    return "Thanks for sharing that. Could you send the best email address to follow up on? I'll make sure Terry has the context."
```

---

## Tool Definitions (api/chat.py lines 47-78)

```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "record_user_details",
            "description": "Record user contact details so Terry can follow up. Call this when user confirms their contact info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "email": {"type": "string", "description": "User's email address"},
                    "name": {"type": "string", "description": "User's name"},
                    "notes": {"type": "string", "description": "Summary of what they want to discuss"},
                },
                "required": ["email", "name", "notes"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "record_unknown_question",
            "description": "Record a question that could not be answered from Terry's information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "The question that couldn't be answered"},
                },
                "required": ["question"],
            }
        }
    }
]
```

**Note:** `description` is the only lever the model has to decide when to fire. If you change
tool behaviour, change the description. `"Call this when user confirms their contact info"` is
what stops it firing on the first "tell me about yourself".

---

## Related Guards

### Input validation (lines 351-367)
```python
SECURITY_CONFIG = {
    "max_input_length": 500,
    "max_tokens_per_response": 360,
    "max_history_messages": 12,
    "max_history_item_length": 800,
    "blocked_keywords": ["ignore previous", "ignore all", "system prompt", "jailbreak"],
    "max_tool_iterations": 3,
}
```
**Important detail (lines 362-365):** blocked keywords only `print()` — they do **not** push.
```python
# Log only — do NOT push. A blocked keyword is cheap to trigger,
# so notifying on each one is a phone-spam vector for attackers.
print(f"Blocked input (keyword={keyword!r}): {message[:100]}")
return False, "I'm here to answer questions about Terry. How can I help you?"
```
This is a deliberate anti-spam decision. Preserve it.

### History sanitization (lines 202-225)
```python
def sanitize_history(history: list) -> list:
    if not isinstance(history, list):
        return []
    clean_messages = []
    allowed_roles = {"user", "assistant"}
    for msg in history[-SECURITY_CONFIG["max_history_messages"]:]:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role")
        content = msg.get("content")
        if role not in allowed_roles or not isinstance(content, str):
            continue
        clean_messages.append({
            "role": role,
            "content": content[:SECURITY_CONFIG["max_history_item_length"]],
        })
    return clean_messages
```
Drops any `system` role the client tries to inject. Caps at 12 messages × 800 chars.

### Edge rate limiting (middleware.ts)
```typescript
import { ipAddress, next } from '@vercel/edge';

const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 20 };

function getClientIP(request: Request): string {
  // Use Vercel's trusted client IP. The raw x-forwarded-for header is
  // client-spoofable (an attacker prepends a fake IP to get a fresh bucket),
  // so it must NOT be used for rate-limit keying.
  return ipAddress(request) || 'unknown';
}

export const config = { matcher: '/api/:path*' };
```

**The lesson to carry over:** `x-forwarded-for` is attacker-controlled. Use a platform-provided
trusted IP. On Cloudflare, that's `request.headers.get('cf-connecting-ip')`.

**Cloudflare Workers ≠ Vercel Edge in one respect:** the in-memory `Map` there is per-isolate
and evicts under load, so the 20/min limit is approximate. For a real limit use a KV namespace
with a fixed-window counter, or Cloudflare Rate Limiting Rules.

### CORS allowlist (lines 483-494)
```python
allowed_origins = [
    "https://www.terrymathew.com",
    "https://terrymathew.com",
    "http://localhost:5173",
    "http://localhost:3000",
]
origin = self.headers.get('Origin', '')
if origin in allowed_origins:
    self.send_header('Access-Control-Allow-Origin', origin)
```
Origin not in list → no CORS header → browser blocks. Preserve the allowlist approach.

---

## Frontend Integration (useChat.ts)

```typescript
const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: content,
        history: history,
    }),
});

const data = await response.json();
if (!response.ok) {
    throw new Error(data.error || 'Failed to get response');
}
setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
```

**Critical: the client never sees push status.** The response is only `{ reply: string }` or
`{ error: string }`. The visitor cannot tell whether a notification was sent, rejected, or
failed. This is deliberate — it prevents probing the push mechanism.

**History is client-owned.** The frontend holds the array and re-sends it every turn:
```typescript
const history = messages
    .filter((_, idx) => idx > 0)  // Skip initial greeting
    .map(m => ({ role: m.role, content: m.content }));
```

---

## Pushover Setup Checklist

1. Pushover account → **Create Application** → get Application Token (`PUSHOVER_TOKEN`)
2. Dashboard → **User Key** (`PUSHOVER_USER`)
3. Install the Pushover app on the target phone
4. Set both as Worker secrets — **never** in code, **never** in client env
5. Test: `curl -d "token=TOKEN&user=USER&message=hello" https://api.pushover.net/1/messages.json`

## Optional Pushover Parameters Not Currently Used

If you want richer notifications in the new build:

| Param | Effect | Use when |
|-------|--------|----------|
| `title` | Notification title | Currently defaults to app name |
| `url` / `url_title` | Tap-through link | Link to the conversation or a mailto |
| `html=1` | Interpret `&quot;` etc. | You'd need to escape the message |
| `sound` | Custom sound | Distinguishing contact vs unknown question |
| `retry` / `expire` | Only for `priority=2` | Not useful for lead capture |
| `timestamp` | Show when it was actually sent | Useful if you move to a queue |

`priority=1` (used for contacts) bypasses quiet hours — correct for a lead. `priority=2` requires
`retry` and `expire` or Pushover errors. Do not use 2 here.
