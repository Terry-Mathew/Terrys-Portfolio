# Digital Twin Chatbot — RAG Architecture

> A plain-English technical briefing you can hand to an AI engineer or explain in an interview.
> Written at **ASD-100 level**: simple sentences, no jargon without an explanation.

---

## 1. What Is This Project?

This is a **chatbot on a portfolio website**. The chatbot talks like the person who owns the portfolio. It answers questions like:

- "What did Terry do at Oracle?"
- "What is Settle?"
- "How do I contact Terry?"

The chatbot uses **Retrieval-Augmented Generation (RAG)**. RAG means: before answering, the system **finds the right information** in a knowledge base, then gives that information to a **large language model (LLM)** so the LLM can write a good answer.

**Why not just ask the LLM directly?**
Because an LLM alone can make things up. RAG gives it real facts to work from.

---

## 2. The Big Picture

```
Visitor asks a question
        │
        ▼
┌──────────────────────────────────────────┐
│  Step 1: Cloudflare Worker (the API)     │  ← Receives the question
│  - Checks rate limit (too many questions?) │
│  - Checks cache (asked this before?)      │
└──────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────┐
│  Step 2: Find the right information      │
│  - Vector search (Vectorize)             │  ← Finds chunks by meaning
│  - Keyword search (D1 + FTS5)             │  ← Finds chunks by exact words
│  - Combine both (RRF fusion)              │
└──────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────┐
│  Step 3: Write the answer                 │
│  - OpenRouter, pinned Claude Sonnet 4.5   │
│  - Follow-up rewriting: Claude Haiku 4.5  │
│  - Fallback for both: Groq                │
│  - Workers AI: embeddings only, never     │
│    generation (see §5b)                   │
└──────────────────────────────────────────┘
        │
        ▼
Visitor sees the answer + source links
```

---

## 3. The Parts (What Each Piece Does)

| Part                          | What It Does                          | Why We Use It                                        |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------- |
| **Cloudflare Workers**        | Runs the backend code                 | Fast, cheap, no server to manage                     |
| **TanStack Start (React 19)** | SSR application, React 19 and Vite    | One codebase for the site and the API routes         |
| **Vectorize**                 | Stores vector embeddings              | Finds information by meaning, not just words         |
| **D1 (SQLite)**               | Stores full text + FTS5 keyword index | Finds information by exact words (BM25)              |
| **KV**                        | Caches retrieval results and answers  | Makes repeat questions instant and cheap             |
| **Workers AI**                | Embeddings only (768 dimensions)      | Free allowance; never writes an answer — see §5b     |
| **OpenRouter**                | Generation and tool calling           | Pinned Claude Sonnet 4.5; paid tier, still available |
| **Claude Haiku 4.5**          | Follow-up question rewriting          | A short rewrite does not need the larger model       |
| **Groq**                      | Generation and tool-calling fallback  | Keeps answering when OpenRouter is unavailable       |
| **`/api/ingest` endpoint**    | Re-embeds the knowledge base          | Authenticated, idempotent, runs inside the Worker    |
| **Golden-set evaluation**     | Scores the deployed chatbot           | Measures the release, not the intention              |

---

## 4. How Knowledge Gets In (Ingestion)

Your knowledge base (bio, experience, projects, contact info) is stored as Markdown files, bundled into the Worker at build time via `?raw` imports. The ingestion pipeline:

```
Markdown files (bundled)
      │
      ▼
Split into chunks (500 chars, 50 overlap)
      │
      ▼
Generate embeddings (Workers AI: bge-base-en-v1.5, 768 dimensions)
      │
      ├──► Store vectors in Vectorize (ids: "<doc>#<n>")
      ├──► Store full text + hash in D1 (keyed by parent id, e.g. "bio")
      └──► Skip documents whose content hash is unchanged
```

**Key concepts:**

- **Chunking**: Split long documents into small pieces. Small pieces find better matches.
- **Overlap**: Each chunk shares 50 characters with the next. This prevents cutting a sentence in half.
- **Hash**: A fingerprint of the document. If the hash is the same, we skip re-embedding (saves cost and time).
- **Idempotent**: Running ingestion twice does the same thing as running it once.
- **Parent vs chunk ids**: Vectorize stores one vector per chunk, keyed `"bio#0"`. D1 stores one row per document, keyed `"bio"`. Retrieval maps chunk hits back to their parent document.

### 4a. Why there is no Queue or Durable Object

The first design routed ingestion through a Cloudflare Queue into a Durable Object.
That was removed for two reasons:

1. **It could not have deployed.** Nitro's `cloudflare-module` preset generates the
   Worker module and its `wrangler.json` itself, and that module only exports a
   `default` fetch handler. A Durable Object class has to be exported from the
   module entrypoint to be addressable at runtime. The config would have declared
   `IngestionProcessor` while nothing exported it.
2. **It was not needed.** The corpus is a handful of small Markdown files that change a
   few times a year and always under human control. A durable pipeline adds
   delivery semantics, batch config, a migration tag and a second failure mode
   for a job that runs in about a second.

`POST /api/ingest` does the same work with less machinery, inside the Worker where
the bindings already exist, guarded by the `INGEST_KEY` secret.

### Knowledge files and frontmatter

Knowledge lives in `src/content/knowledge/` as Markdown, bundled at build time
by `import.meta.glob`. A file may open with a YAML frontmatter block:

```markdown
---
title: Terry Mathew — Canonical Facts
type: canonical_facts
priority: 100
updated: 2026-10
aliases:
  - Terry Mathew
  - current role
---
```

`src/server/frontmatter.ts` parses it. The `title` becomes the document title
shown on a source link, falling back to the first heading. Everything else is
deliberately dropped before the text is used: the chunks, the embeddings, the D1
content and FTS rows, and the content hash all see the body alone.

The reason it is parsed rather than left inline is the hash. The hash is what
decides whether a document is re-embedded, so metadata inside the body would
mean a title edit forces a re-embed of a document whose prose had not changed by
a character. It would also put an identical run of metadata tokens into every
document's embedding, and let a question containing the word "priority" match
every document at once through BM25.

The parser is purpose-built for those five keys rather than a general YAML
implementation — about ninety lines, no dependencies, and it cannot throw. A
construct it does not understand is ignored, and a file that does not open with a
fence is returned untouched, so the cost of unparseable metadata is that the
metadata goes unused rather than that content is lost. `priority` is parsed but
not used for ranking; no column was added for it, because ranking is a separate
decision from storing a number someone typed.

No schema change was needed. `documents.title` already existed and was already
written on every upsert, so the frontmatter title feeds an existing column.

### What the ingest key actually protects

`ingestKnowledge()` reads from `SOURCES`, a hardcoded array of Markdown bundled
into the Worker at build time. The endpoint accepts **no content in the request
body** — only the `x-ingest-key` header. So the key is a _write trigger_, not a
content-injection vector. Someone holding it can:

- force a re-index of content that is already in the build (costs a few Workers
  AI embedding calls, no lasting effect)
- run the read-only `GET /api/ingest` probe

They **cannot** add, replace, or alter any text. That limit comes from the
endpoint's shape, not from the strength of the key, so it holds even if the key
leaks. Keep the key secret anyway to stop anyone burning your daily Workers AI
neurons. Rotate it with `npx wrangler secret put INGEST_KEY` if it is ever
exposed.

---

## 5. How Questions Get Answered (Retrieval + Generation)

### 5a. Finding the right information (Retrieval)

When a visitor asks a question, we search in three ways:

| Method                    | What It Does                                             | Good At                                                                 |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Vector search**         | Converts the question to a number, finds similar numbers | "Tell me about Oracle" → finds "Oracle experience" even if words differ |
| **Keyword search (BM25)** | Searches for exact words                                 | "Settle" → finds "Settle" exactly                                       |
| **Static lookup**         | Checks known trigger words                               | Fast, always works, no AI needed                                        |

We combine all three results using **Reciprocal Rank Fusion (RRF)**. RRF is a simple formula: a document that ranks #1 in any method gets a high score. This way, if one method finds it, it appears in the results.

### 5b. Writing the answer (Generation)

The retrieved chunks are sent to an LLM with a **system prompt** (the persona). The LLM writes a natural answer using only the provided information.

**Model routing.** Two separate chains, and the order matters:

1. **Tool-capable pass** — OpenRouter, then Groq. Lead capture (`record_user_details`,
   `record_unknown_question`) lives here, so the model doing the writing is the model
   that can be handed a tool. Bounded at 3 iterations; if no tier produces an answer it
   returns null and the turn falls through to plain generation, which costs lead capture
   and nothing else.
2. **Plain pass** — Anthropic (off by default), OpenRouter, Groq. Workers AI is
   deliberately absent; see the note below.

> **Models are pinned to specific ids.** `openrouter/free` was used here for a while. It is
> a _routing alias_, not a model — OpenRouter chooses what backs it and can change that
> without notice. Since it also governed tool calling, a silent swap changed lead capture as
> well as prose, and nothing looked broken because the chatbot kept answering.
> `scripts/verify-models.mjs` checks an id before it is trusted.

**Generation ordering, and why Workers AI is not on it.** One LLM answer costs orders of
magnitude more of Workers AI's 10,000 neurons/day than one query embedding does. The eval
suite alone fires twenty answers per deploy. With Workers AI last in the chain, those
answers exhausted the day's allowance before the corpus could be re-embedded — which is
the 4006 error, and a chatbot that cannot answer because its own test suite drained it.
Workers AI is therefore **embeddings only** (`useWorkersAiGeneration: false`), so those
neurons serve retrieval and nothing else.

---

## 6. The Persona System Prompt

The system prompt tells the LLM who to be. It includes:

- **Identity**: "You are Terry Mathew"
- **Style**: "Concise, technical, direct. No fluff."
- **Boundaries**: "Only answer from the provided context."
- **Refusal**: "If the answer is not in context, say 'I don't have that in my knowledge base.'"
- **Privacy**: "Enterprise details are limited — ask over email."

This keeps the chatbot on-brand and prevents hallucination.

---

## 7. Performance (Speed & Cost)

### Speed targets

| Path          | Target               | Why                                    |
| ------------- | -------------------- | -------------------------------------- |
| Cached answer | <50ms                | No AI call, just KV lookup             |
| Vector search | <200ms               | Workers AI embedding + Vectorize query |
| Full answer   | <1.5s to first token | OpenRouter/Groq generation             |

Retrieval runs its two live methods **in parallel** (`Promise.all` over the Vectorize query
and the D1 FTS5 query). They are independent, so sequencing them made p95 latency the sum of
both round trips rather than the slower one — directly in front of the first token.

### Cost optimisation

- **Answer cache in front of generation**: Repeat first-turn questions skip the LLM entirely (0 cost). Keyed on the _raw_ question, so a hit costs nothing to find — checking a condensed key would mean paying for the rewrite to avoid paying for the answer. Follow-ups are never cached: their meaning depends on the turn before them, so a text-only key would let one visitor's "tell me more" serve another's answer.
- **Extractive fallback**: If every model tier is unavailable, answer from the retrieved passage rather than erroring. Retrieval does not depend on the AI binding, so the visitor still gets a real answer.
- **Small embedding model**: 768 dimensions (cheap, fast)
- **No Workers AI generation**: See §5b — sharing that budget with the corpus rebuild is what starved ingestion.
- **Sliding window**: Only the last 6 turns are sent from the client, and the server clamps that to 12 messages of 800 characters regardless.
- **Max tokens**: 1024 max output (bounds cost)

### Monthly cost estimate

| Component                              | Cost          |
| -------------------------------------- | ------------- |
| Cloudflare Workers (100K req/day free) | $0            |
| Vectorize (5M vectors free)            | $0            |
| D1 (5GB free)                          | $0            |
| KV (100K reads/day free)               | $0            |
| Workers AI (embeddings, 100K neurons)  | $0            |
| OpenRouter (`claude-sonnet-4.5`)       | ~$0.03/answer |
| **Total**                              | **see below** |

OpenRouter is the paid tier and the only line item. At roughly **$0.03 an answer**,
1000 answers a month is about $30; 100 answers a month is about $3. It is deliberately
first in the chain because it is the tier that still answers when both free tiers are
exhausted — which is exactly when visitors most need a working chatbot. Groq covers the
tail of the day for nothing.

---

## 8. Graceful Degradation (What Happens When Things Break)

The system never shows a raw error. It has fallback layers:

```
Full RAG pipeline fails?
        │
        ▼
Static keyword search (no AI, always works)
        │
        ▼
Static fallback message with contact email
```

> **This fallback also masks configuration faults.** When the semantic layer
> fails, the site still returns answers — they simply come from the static
> keyword table rather than vector search. Nothing looks broken from the
> outside. Always check the deployment checklist in §10b before treating a
> working chat as a working RAG system.

---

## 9. Security & Privacy

| Concern          | Solution                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API key exposure | Stored as Cloudflare secrets (never in code)                                                                                                                                            |
| Rate limiting    | 20 questions per minute per IP. Ten blocked a visitor asking six legitimate follow-ups, and tripped the eval suite immediately                                                          |
| Data privacy     | Knowledge base is yours; no user data is stored beyond the request                                                                                                                      |
| Prompt injection | System prompt overrides; LLM instructed to ignore outside instructions. Visitor history is clamped server-side — 12 messages, 800 characters each — because it arrives from the browser |
| Hallucination    | "Only answer from context" instruction + citation links                                                                                                                                 |

---

## 10. Configuration (Where to Change Things)

All settings live in `src/server/chat.config.ts`:

```ts
export const CHAT_CONFIG = {
  mode: "vector", // "static" or "vector"
  useWorkersAiGeneration: false, // embeddings only — see §5b
  openRouterModel: "anthropic/claude-sonnet-4.5", // pinned, not an alias
  openRouterCondenseModel: "anthropic/claude-haiku-4.5", // question rewrites
  groqModel: "qwen/qwen3.8-27b", // free backup tier
  useAnthropic: false, // opt-in premium prose
  embeddingModel: "@cf/baai/bge-base-en-v1.5", // 768 dimensions
  dimensions: 768,
  topK: 8, // candidates per method in
  rerankTopK: 4, // chunks out to the LLM
  chunkSize: 900, // characters per chunk
  chunkOverlap: 120, // overlap between chunks
  corpusVersion: 7, // bump on any knowledge file or source-anchor change
  rateLimitPerMinPerIp: 20, // anti-abuse
  cacheTTL: 86400, // 24 hours retrieval cache
  promptVersion: 2, // bump on any system prompt change
};
```

**Two version numbers, two different jobs.** `corpusVersion` and `promptVersion` are both
folded into the answer-cache key, and bumping either retires every cached answer instantly
(KV has no tag invalidation). `corpusVersion` when `src/content/knowledge/*.md` changes —
**including a source-anchor change**, since the category becomes the citation link on the
answer. `promptVersion` when the system prompt text changes. A missing bump means
yesterday's question returns yesterday's answer.

> **Chunk sizes are characters, not tokens.** The comment in the config used to say
> "tokens" for a value applied to `.slice()` on a string. `chunkSize: 900` is 900
> characters. That is the number that matters when reasoning about prompt size, because
> `rerankTopK: 4` chunks of 900 characters is roughly 900 tokens of context.

**Changing a pinned model id is a change to lead capture,** because the tool-capable pass
reuses `openRouterModel`. Run `npm run verify:models` and diff `npm run eval` before and
after.

**Invariant — dimension matching.** Three values must always agree:

1. `CHAT_CONFIG.dimensions` (`768`)
2. The Vectorize index dimensions in `wrangler.jsonc` (`768`)
3. The embedding model's output width (`@cf/baai/bge-base-en-v1.5` → 768)

Cloudflare allows up to 1536 dimensions, but that is a **ceiling, not a
requirement**. The index must be created at the model's own width. A mismatch
makes every insert and query fail. Changing model or index size means changing
all three together.

---

## 10b. Deployment Checklist (Before Demoing)

The semantic layer is not live until all three are true:

- [ ] **Vectorize index dimensions match the embedding model.**
      Create with `--dimensions=768 --metric=cosine`.
      Verify with `wrangler vectorize list` — read the `dimensions` column.
      A mismatch fails every insert and query, and the system quietly falls
      back to static keyword lookup.

- [ ] **Queue consumer is routed to the Durable Object.**
      Not applicable — there is no queue. Ingestion is a plain HTTP endpoint.
      See §4a for why the durable pipeline was removed.
- [ ] **Ingestion has actually been run.**
      Both stores start empty. After deploying a build that changed
      `src/content/knowledge/*.md`:
      `curl -X POST https://<host>/api/ingest -H "x-ingest-key: $INGEST_KEY"`
      Then confirm: - `SELECT COUNT(*) FROM documents` in D1 → non-zero - Vectorize returns matches for a known query

**How to tell it's really working:** ask a question phrased in ordinary words
that share no vocabulary with the source text. Keyword matching will miss it;
semantic retrieval will not. If that question returns the canned
"I only know about Terry's portfolio" reply, the static fallback is still
active and the RAG layer is not doing anything.

---

## 11. Cloudflare Resources

| Resource        | Name                               | Purpose                                                        |
| --------------- | ---------------------------------- | -------------------------------------------------------------- |
| D1 Database     | `terry-knowledge`                  | Stores documents, passages, and the FTS5 keyword index         |
| Vectorize Index | `terry-kb`                         | Stores vector embeddings (768d, must match `bge-base-en-v1.5`) |
| KV Namespace    | `CACHE`                            | Answer cache, retrieval cache, and the degraded-status flag    |
| Workers AI      | (binding)                          | Embeddings only — never generation                             |
| Secrets         | `OPENROUTER_API_KEY`               | Paid generation tier, and the tool-calling tier                |
| Secrets         | `GROQ_API_KEY`                     | Free generation and tool-calling backup                        |
| Secrets         | `ANTHROPIC_API_KEY`                | Optional premium prose (`useAnthropic: false` by default)      |
| Secrets         | `INGEST_KEY`                       | Authorises `POST /api/ingest`                                  |
| Secrets         | `PUSHOVER_TOKEN` / `PUSHOVER_USER` | Lead and deploy notifications                                  |

> **Secrets are set in two different stores.** GitHub Actions `secrets` and
> `wrangler secret` are not the same thing. A workflow can deploy without the Worker ever
> having been given the key — which is exactly how the ingest step once reported success
> while doing nothing at all.

---

## 12. Interview Talking Points

If someone asks "Tell me about your RAG architecture":

> "I built a personal knowledge chatbot that uses Retrieval-Augmented Generation. The knowledge base is stored in Cloudflare D1 and Vectorize. When a question comes in, I run hybrid retrieval — vector search for meaning plus BM25 keyword search for exact terms — and I run those two in parallel, then fuse the results with Reciprocal Rank Fusion. The top chunks go to a pinned Claude model behind a strict persona system prompt so the bot never makes things up. There's an answer cache in front of generation, so repeat questions return in under 50 milliseconds with zero LLM cost. The whole thing runs on Cloudflare Workers, so there's no server to manage."

**Follow-up questions you might get:**

**Q: Why hybrid search?**

> "Vector search is good at meaning but misses exact terms like product names. BM25 catches those. Using both means better recall."

**Q: What is RRF?**

> "Reciprocal Rank Fusion. Each search method ranks documents. RRF combines the rankings using the formula 1/(60 + rank). A document ranked #1 by any method gets a high fused score. The contributions accumulate — a document all three methods agree on outranks one that only a single method found."

**Q: How do you prevent hallucination?**

> "The system prompt says 'only answer from the provided context,' and the stronger rule is that when the context is empty the model may use its own voice but never state a fact. That's deliberate — an empty context block otherwise reads to the model as a malfunction and it narrates the failure, and telling it to 'reply from your own knowledge' to fix the tone quietly grants it licence to invent things about a real person. I also show source links so the user can verify."

**Q: How do you know when it's actually working?**

> "Two layers. `retrievalMode` reports what really contributed rather than that the call succeeded — set from the call not throwing, a completely dead vector index looks identical to a healthy one. And there's an eval suite that scores a golden set end to end, plus a retrieval-only endpoint, because 'the answer was bad' is not a diagnosis: a persona rewrite can't fix a corpus that doesn't contain the answer, and the symptom looks the same from the chat window."

**Q: What's the cost?**

> "Cloudflare's free tiers cover Workers, Vectorize, D1 and KV, and embeddings are on the free Workers AI allowance. The only cost is the generation model, roughly three cents an answer. That's deliberately the tier that stays available when both free tiers are exhausted."

---

## 13. File Map

| File                                 | What It Does                                                    |
| ------------------------------------ | --------------------------------------------------------------- |
| `src/server/chat.config.ts`          | All configuration settings                                      |
| `src/server/chat.ts`                 | Main server function: receives questions, calls retrieval + LLM |
| `src/server/knowledge.ts`            | Retrieval logic: vector, BM25, static, RRF fusion               |
| `src/server/chat-status.ts`          | The degraded-status flag behind the panel's availability dot    |
| `src/server/frontmatter.ts`          | Parses and strips leading YAML frontmatter from knowledge files |
| `src/server/chat-tools.ts`           | Lead-capture tool definitions and their guards                  |
| `src/server/history.ts`              | Server-side clamp on the client-supplied conversation           |
| `src/server/ingest.ts`               | Chunks, embeds and upserts the knowledge base                   |
| `src/server/env.ts`                  | Resolves Cloudflare bindings under either Nitro preset          |
| `src/routes/api.chat.ts`             | `POST /api/chat` (SSE) and `GET /api/chat` (health)             |
| `src/routes/api.ingest.ts`           | `POST /api/ingest` and the authenticated `GET ?check=1` probe   |
| `src/routes/api.retrieve.ts`         | `POST /api/retrieve` — retrieval only, for diagnosis            |
| `src/components/site/ChatWidget.tsx` | Frontend chat UI                                                |
| `scripts/eval.mjs`                   | Golden-set evaluator; classifies failures and gates the deploy  |
| `scripts/verify-models.mjs`          | Pre-flight for a pinned model id                                |
| `scripts/pipeline-test.mjs`          | Retrieval, embedding and chunking diagnostics                   |
| `scripts/render-assets.mjs`          | Renders the OG image and icon set from `assets/`                |
| `wrangler.jsonc`                     | Cloudflare bindings configuration                               |

---

_Last updated: 2026-10-02_
