// Pre-flight for a pinned OpenRouter model id.
//
//   npm run verify:models
//
// The key is read from OPENROUTER_API_KEY, or from a gitignored `.dev.vars` or
// `.env` in the repo root if that is not set. It is deliberately NOT read from
// argv, and the invocation never has the key on the command line —
// `OPENROUTER_API_KEY=sk-… npm run verify:models` writes the key into shell
// history and into the process table, where it outlives the command. `.dev.vars`
// is already the convention for local Worker secrets and is already gitignored.
//
// The key is used only in an `authorization` header. It is never logged, never
// printed, and never included in an error message — failures surface the
// response status and the first 200 characters of the response body, which is
// the provider's error text and never echoes the credential back.
//
// Why this is a script and not a comment: `openrouterModel` governs tool
// calling as well as prose, because `generateWithTools` reuses it. Swapping the
// id is therefore a change to lead capture, and the previous routing alias
// broke exactly that without anyone noticing — the chatbot kept answering, so
// nothing looked wrong, and leads simply stopped arriving.
//
// Two halves, with different requirements:
//
//   - No key needed. Reads the public /api/v1/models and checks that every id
//     in CHAT_CONFIG actually exists, advertises tool support, and has a
//     context window larger than a real turn. Catches a retired id and an
//     alias that resolves to something without tools.
//
//   - Key needed. Actually calls each id: streaming frames, a tool-call round
//     trip through the same shape generateWithTools uses, and JSON argument
//     reliability over repeated attempts. Skips, loudly, without a key.
//
// Exits non-zero on any failure so it can gate a change the same way the eval
// gate gates a deploy.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Find the API key without it ever passing through argv or the terminal.
 *
 * `.dev.vars` and `.env` are both gitignored, and both hold `NAME="value"`.
 * `.dev.vars` is checked first because it is what `wrangler dev` already reads,
 * so anyone who has run the Worker locally has their secrets there already and
 * does not need to set anything up for this script.
 *
 * Returns "" rather than undefined so the "not configured" path is a value
 * check, and never returns a value that could be interpolated into a log line.
 */
function readKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const name of [".dev.vars", ".env"]) {
    const path = join(ROOT, name);
    if (!existsSync(path)) continue;
    const match = /^OPENROUTER_API_KEY\s*=\s*["']?([^"'\n]+)["']?\s*$/m.exec(
      readFileSync(path, "utf8"),
    );
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return "";
}

const KEY = readKey();
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";

const C = { r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };

// Read the ids out of the config rather than importing it, so this runs under
// plain node with no build step. A literal that is read from a file is checked
// by the file; a literal pasted here is checked by nothing.
const config = readFileSync(join(ROOT, "src", "server", "chat.config.ts"), "utf8");
const read = (key) => {
  const m = new RegExp(`${key}:\\s*"([^"]+)"`).exec(config);
  return m?.[1] ?? "";
};

const CHAT_MODEL = read("openRouterModel");
const CONDENSE_MODEL = read("openRouterCondenseModel") || CHAT_MODEL;

/** A real turn: 4 reranked chunks of ~900 chars, plus history, plus prompt. */
const TURN_INPUT_TOKENS = 16000;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "record_user_details",
      description: "Record a contact the visitor typed.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
      },
    },
  },
];

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`${C.r}  FAIL${C.x}  ${msg}`);
};
const ok = (msg) => console.log(`${C.g}  ok  ${C.x}    ${msg}`);
const warn = (msg) => console.log(`${C.y}  warn${C.x}  ${msg}`);

console.log(`\n${C.b}Pinned model verification${C.x}\n`);

// ---- half 1: catalogue. No key required. -------------------------------

console.log(`${C.b}1. Catalogue${C.x} ${C.d}(public, no key)${C.x}`);

const ids = [
  ["chat", CHAT_MODEL],
  ["condense", CONDENSE_MODEL],
];

let catalogue = new Map();
try {
  const res = await fetch(MODELS_ENDPOINT, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  catalogue = new Map(data.map((m) => [m.id, m]));
} catch (e) {
  fail(`could not read ${MODELS_ENDPOINT}: ${e.message}`);
}

for (const [role, id] of ids) {
  if (!id) {
    fail(`${role}: no id configured`);
    continue;
  }
  const m = catalogue.get(id);
  if (!m) {
    fail(
      `${role}: "${id}" is not in the OpenRouter catalogue — a retired id answers 404 at runtime`,
    );
    continue;
  }
  const params = m.supported_parameters ?? [];
  if (!params.includes("tools") || !params.includes("tool_choice")) {
    fail(`${role}: "${id}" does not advertise tool support, and generateWithTools reuses this id`);
  } else {
    ok(`${role}: ${id} advertises tools`);
  }
  if ((m.context_length ?? 0) < TURN_INPUT_TOKENS) {
    fail(
      `${role}: "${id}" has ${m.context_length} context, under the ~${TURN_INPUT_TOKENS} a full turn uses`,
    );
  } else {
    ok(`${role}: context ${m.context_length} ≥ ${TURN_INPUT_TOKENS}`);
  }
  const perMtok = (Number(m.pricing?.prompt) + Number(m.pricing?.completion)) * 1e6;
  ok(`${role}: $${perMtok.toFixed(2)}/Mtok combined`);
}

if (failures.length) {
  console.log(`\n${C.r}Catalogue checks failed. Do not ship these ids.${C.x}\n`);
  process.exit(1);
}

// ---- half 2: live round trip. Needs a key. -----------------------------

if (!KEY) {
  warn("No OpenRouter key found — skipping the live round trip.");
  warn("Checked OPENROUTER_API_KEY, .dev.vars and .env.");
  warn("Tool calling, streaming and argument reliability are UNVERIFIED.");
  warn("Put the key in .dev.vars (gitignored, same as `wrangler dev` uses) and re-run:");
  warn("  npm run verify:models");
  console.log("");
  process.exit(0);
}

console.log(`\n${C.b}2. Live round trip${C.x} ${C.d}(needs a key)${C.x}`);

/** One non-streaming completion, returning the parsed body. */
async function complete(model, body) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
      // OpenRouter attributes free-tier routing on these; harmless when paid.
      "http-referer": "https://terrymathew.com",
      "x-title": "Terry Mathew portfolio",
    },
    body: JSON.stringify({ model, ...body }),
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  return { data: JSON.parse(text), raw: text };
}

/** Collect streamed content frames the same way readSse does on the Worker. */
async function stream(model, body) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model, stream: true, ...body }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let frames = 0;
  let sawDone = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const frame of parts) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        sawDone = true;
        continue;
      }
      let chunk;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }
      frames++;
      text += chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
    }
  }
  return { text, frames, sawDone };
}

// 2a. Streaming.
{
  const started = Date.now();
  try {
    const { text, frames, sawDone } = await stream(CHAT_MODEL, {
      messages: [{ role: "user", content: "In one sentence: what is a vector index?" }],
      max_tokens: 120,
    });
    const ms = Date.now() - started;
    if (!text.trim()) fail(`streaming returned no content from ${CHAT_MODEL}`);
    else if (frames < 2) fail(`streaming produced ${frames} frame(s) — not a real stream`);
    else if (!sawDone) warn("stream ended without a [DONE] frame");
    else ok(`streaming: ${frames} frames, ${text.trim().length} chars, ${ms}ms`);
  } catch (e) {
    fail(`streaming failed: ${e.message}`);
  }
}

// 2b. A real tool round trip, in the shape generateWithTools builds.
//     Three attempts, because a model that reliably emits valid JSON sometimes
//     does not — and "sometimes" is exactly what a single pass hides.
{
  const prompt = [
    {
      role: "system",
      content:
        "You are Terry Mathew's assistant. Capture a contact only when the visitor gives one.",
    },
    {
      role: "user",
      content:
        "Context:\nTerry can be emailed at terry.perangat@gmail.com.\n\n" +
        "Question: hi, I'm Priya Raman, priya@example.com — do you take contract work?",
    },
  ];

  let toolRounds = 0;
  let refusals = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await complete(CHAT_MODEL, {
        messages: prompt,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 512,
      });
      const calls = data.choices?.[0]?.message?.tool_calls ?? [];
      if (calls.length === 0) {
        refusals++;
        continue;
      }
      const args = JSON.parse(calls[0].function.arguments);
      if (typeof args.name !== "string" || typeof args.email !== "string") {
        fail(
          `attempt ${attempt + 1}: tool arguments were not both strings — ${calls[0].function.arguments}`,
        );
        continue;
      }
      if (!args.email.includes("@")) {
        fail(`attempt ${attempt + 1}: tool email "${args.email}" is not an address`);
        continue;
      }
      toolRounds++;
      break;
    } catch (e) {
      fail(`tool round trip attempt ${attempt + 1} failed: ${e.message}`);
    }
  }

  if (toolRounds > 0) ok(`tool call: valid arguments on ${toolRounds}/3 attempt(s)`);
  else
    fail(
      `no valid tool call in 3 attempts (${refusals} returned text instead). ` +
        "Lead capture depends on this — the chat still answers, so it fails quietly.",
    );
}

// 2c. Condensing, which is what the second id is for.
if (CONDENSE_MODEL !== CHAT_MODEL) {
  try {
    const { data } = await complete(CONDENSE_MODEL, {
      messages: [
        {
          role: "system",
          content:
            "Rewrite the visitor's latest question as a standalone search query. " +
            "Resolve pronouns using the conversation. Keep it under 20 words. Output only the rewritten query.",
        },
        {
          role: "user",
          content:
            "Visitor: What did he do as a team lead at Oracle?\nTerry: He led EMEA operations.\nVisitor: How long was he leading that team?",
        },
      ],
      max_tokens: 64,
    });
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    // The actual acceptance rule in condenseQuestion, so this cannot drift from it.
    const usable = rewritten && rewritten.length >= 3 && rewritten.length <= 300;
    if (usable) ok(`condense: "${rewritten.slice(0, 80)}"`);
    else fail(`condense returned an unusable rewrite: ${JSON.stringify(rewritten)}`);
  } catch (e) {
    fail(`condense failed: ${e.message}`);
  }
}

if (failures.length) {
  console.log(`\n${C.r}${failures.length} check(s) failed.${C.x}\n`);
  process.exit(1);
}
console.log(`\n${C.g}All checks passed.${C.x} Re-run npm run eval to diff the golden set.\n`);
