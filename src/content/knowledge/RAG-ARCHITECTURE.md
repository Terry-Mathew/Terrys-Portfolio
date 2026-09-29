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
│  - Anthropic Claude (best quality)        │
│  - Fallback: Workers AI Llama (cheaper)   │
└──────────────────────────────────────────┘
        │
        ▼
Visitor sees the answer + source links
```

---

## 3. The Parts (What Each Piece Does)

| Part                       | What It Does                         | Why We Use It                                |
| -------------------------- | ------------------------------------ | -------------------------------------------- |
| **Cloudflare Workers**     | Runs the backend code                | Fast, cheap, no server to manage             |
| **Vectorize**              | Stores vector embeddings             | Finds information by meaning, not just words |
| **D1 (SQLite)**            | Stores full text + keyword index     | Finds information by exact words (BM25)      |
| **KV**                     | Caches answers to repeated questions | Makes repeat questions instant and free      |
| **Workers AI**             | Embeddings + fast generation         | Free tier, no external API cost              |
| **Anthropic Claude**       | High-quality answer writing          | Best at following persona instructions       |
| **`/api/ingest` endpoint** | Re-embeds the knowledge base         | Manual, idempotent, runs inside the Worker   |

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
2. **It was not needed.** The corpus is five small Markdown files that change a
   few times a year and always under human control. A durable pipeline adds
   delivery semantics, batch config, a migration tag and a second failure mode
   for a job that runs in about a second.

`POST /api/ingest` does the same work with less machinery, inside the Worker where
the bindings already exist, guarded by the `INGEST_KEY` secret.

### What the ingest key actually protects

`ingestKnowledge()` reads from `SOURCES`, a hardcoded array of Markdown bundled
into the Worker at build time. The endpoint accepts **no content in the request
body** — only the `x-ingest-key` header. So the key is a *write trigger*, not a
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

**Model routing:**

- First try: **Anthropic Claude 3.5 Sonnet** (best quality, follows persona instructions)
- Fallback: **Workers AI Llama 3.1 8B** (free, fast, always available)

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
| Full answer   | <1.5s to first token | Anthropic API + LLM generation         |

### Cost optimisation

- **Semantic cache**: Repeat questions skip the LLM entirely (0 cost)
- **Static mode fallback**: If AI fails, use keyword search (0 cost)
- **Small embedding model**: 768 dimensions (cheap, fast)
- **Sliding window**: Only last 3–5 turns in context (fewer tokens)
- **Max tokens**: 1024 max output (bounds cost)

### Monthly cost estimate

| Component                              | Cost          |
| -------------------------------------- | ------------- |
| Cloudflare Workers (100K req/day free) | $0            |
| Vectorize (5M vectors free)            | $0            |
| D1 (5GB free)                          | $0            |
| KV (100K reads/day free)               | $0            |
| Workers AI (100K neurons/day free)     | $0            |
| Anthropic API (~500K input tokens)     | ~$3           |
| **Total**                              | **~$3/month** |

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

| Concern          | Solution                                                               |
| ---------------- | ---------------------------------------------------------------------- |
| API key exposure | Stored as Cloudflare secrets (never in code)                           |
| Rate limiting    | 10 questions per minute per IP                                         |
| Data privacy     | Knowledge base is yours; no user data is stored beyond the request     |
| Prompt injection | System prompt overrides; LLM instructed to ignore outside instructions |
| Hallucination    | "Only answer from context" instruction + citation links                |

---

## 10. Configuration (Where to Change Things)

All settings live in `src/server/chat.config.ts`:

```ts
export const CHAT_CONFIG = {
  mode: "vector", // "static" or "vector"
  generationModel: "@cf/meta/llama-3.1-8b-instruct", // Workers AI fallback
  embeddingModel: "@cf/baai/bge-base-en-v1.5", // 768 dimensions
  topK: 8, // How many chunks to retrieve
  rerankTopK: 5, // How many to pass to the LLM
  chunkSize: 500, // Tokens per chunk
  chunkOverlap: 50, // Overlap between chunks
  rateLimitPerMinPerIp: 10, // Anti-abuse
  cacheTTL: 86400, // 24 hours cache
};
```

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

| Resource        | Name                | Purpose                                                        |
| --------------- | ------------------- | -------------------------------------------------------------- |
| D1 Database     | `terry-knowledge`   | Stores documents + FTS5 keyword index                          |
| Vectorize Index | `terry-kb`          | Stores vector embeddings (768d, must match `bge-base-en-v1.5`) |
| KV Namespace    | `CACHE`             | Caches answers to repeated questions                           |
| Workers AI      | (binding)           | Embeddings + fast LLM generation                               |
| Secrets         | `ANTHROPIC_API_KEY` | Claude API access                                              |
| Secrets         | `INGEST_KEY`        | Authorises `POST /api/ingest`                                  |

---

## 12. Interview Talking Points

If someone asks "Tell me about your RAG architecture":

> "I built a personal knowledge chatbot that uses Retrieval-Augmented Generation. The knowledge base is stored in Cloudflare D1 and Vectorize. When a question comes in, I run hybrid retrieval — vector search for meaning plus BM25 keyword search for exact terms — and fuse the results with Reciprocal Rank Fusion. The top chunks go to Claude 3.5 Sonnet with a strict persona system prompt so the bot never makes things up. There's a KV semantic cache in front of everything, so repeat questions return in under 50 milliseconds with zero LLM cost. The whole thing runs on Cloudflare Workers, so there's no server to manage and it costs about three dollars a month."

**Follow-up questions you might get:**

**Q: Why hybrid search?**

> "Vector search is good at meaning but misses exact terms like product names. BM25 catches those. Using both means better recall."

**Q: What is RRF?**

> "Reciprocal Rank Fusion. Each search method ranks documents. RRF combines the rankings using the formula 1/(60 + rank). A document ranked #1 by any method gets a high fused score."

**Q: How do you prevent hallucination?**

> "The system prompt says 'only answer from the provided context.' If the LLM doesn't find the answer, it says 'I don't have that in my knowledge base.' I also show source links so the user can verify."

**Q: What's the cost?**

> "About three dollars a month. Cloudflare's free tiers cover Workers, Vectorize, D1, and KV. The only cost is the Anthropic API for high-quality answers."

---

## 13. File Map

| File                                 | What It Does                                                    |
| ------------------------------------ | --------------------------------------------------------------- |
| `src/server/chat.config.ts`          | All configuration settings                                      |
| `src/server/chat.ts`                 | Main server function: receives questions, calls retrieval + LLM |
| `src/server/knowledge.ts`            | Retrieval logic: vector, BM25, static, RRF fusion               |
| `src/server/ingest.ts`               | Chunks, embeds and upserts the knowledge base                   |
| `src/server/env.ts`                  | Resolves Cloudflare bindings under either Nitro preset          |
| `src/routes/api.ingest.ts`           | `POST /api/ingest` — the ingestion trigger                      |
| `src/components/site/ChatWidget.tsx` | Frontend chat UI                                                |
| `scripts/render-assets.mjs`          | Renders the OG image and icon set from `assets/`                |
| `wrangler.jsonc`                     | Cloudflare bindings configuration                               |

---

_Last updated: 2026-09-29_
