# Terry Mathew — Portfolio

Editorial portfolio site with a RAG-powered digital-twin chatbot that answers
questions about the work.

**Live:** [terrymathew.com](https://terrymathew.com)

---

## The chatbot

Ask it anything about the work. It answers from a knowledge base, not from
memory, so it cannot invent facts about a real person.

- **Hybrid retrieval** — vector similarity (Cloudflare Vectorize, 768d) *and*
  BM25 keyword search (D1 + SQLite FTS5), merged with Reciprocal Rank Fusion.
  Each method fails differently: vectors catch paraphrase, BM25 catches exact
  terms like `1.2B credits`.
- **Conversational** — follow-ups are rewritten into standalone queries before
  retrieval, so *"how long was he leading that team?"* resolves its pronoun
  against the conversation rather than searching for the word "team".
- **Persona** — a system prompt with separate modes for work, personal, and
  hostile questions, plus guards against prompt injection and against
  disclosing the prompt itself.
- **Streaming** — token-by-token over server-sent events.
- **Free** — the entire system runs on Cloudflare's free tier. No external AI
  provider, no API key, no per-token cost.

Full architecture: [`src/content/knowledge/how-this-works.md`](src/content/knowledge/how-this-works.md)

### Content pipeline

Knowledge lives as Markdown in `src/content/knowledge/`. Files are discovered at
build time — adding one requires no code change. The PDF résumé is converted to
Markdown on every build, so it is searchable rather than just downloadable.

To publish content changes:

```sh
npm run build && npx nitro deploy --prebuilt
curl -X POST "https://terrymathew.com/api/ingest?force=1" -H "x-ingest-key: $INGEST_KEY"
```

Bump `corpusVersion` in `src/server/chat.config.ts` first, or the KV semantic
cache will keep serving pre-update retrieval.

---

## Evaluation

`npm run eval` scores the **live** chatbot against 20 golden cases — retrieval
coverage, out-of-scope behaviour, and multi-turn pronoun resolution.

```
Total      17/20
Retrieval  13/16
Behaviour   2/2
```

This is not decoration. Five of the eleven defects documented in
`how-this-works.md` returned `"ok": true` while returning nothing useful — a
silently disabled vector index, a keyword search that had never once executed,
and a content hash written before the vectors it referred to. A suite that
measures retrieval turns those into a score of zero, which is impossible to miss.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (SSR) + React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Runtime | Cloudflare Workers (Nitro, `cloudflare-module` preset) |
| Vectors | Cloudflare Vectorize |
| Database | Cloudflare D1 (SQLite + FTS5) |
| Cache | Cloudflare KV |
| AI | Cloudflare Workers AI — embeddings, rewriting, generation |

No server to run. No database to provision beyond four CLI commands.

---

## Development

Requires **Node.js 22.12+** (TanStack Start's floor) and npm.

```sh
npm i
npm run dev
```

`poppler-utils` is needed for the résumé → Markdown step. On macOS:
`brew install poppler`. The build continues without it — it just ships the
previously generated file.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs the résumé extraction first) |
| `npm run lint` | ESLint + Prettier check |
| `npm run eval` | Score the live chatbot against the golden set |
| `npm run assets` | Re-render the OG image and icon set from `assets/` |

### Secrets

Two secrets, both as Cloudflare Worker secrets. Neither is in the repo.

```sh
npx wrangler secret put INGEST_KEY   # authorises POST /api/ingest
```

`ANTHROPIC_API_KEY` is supported but off by default — the chatbot is designed to
run entirely on the free tier, so the key is optional.

### Cloudflare resources

```sh
npx wrangler d1 create terry-knowledge
npx wrangler kv namespace create CACHE
npx wrangler vectorize create terry-kb --dimensions=768 --metric=cosine
```

> The Vectorize index must be created at **768** dimensions to match the
> embedding model. Cloudflare permits up to 1536 — that is a ceiling, not a
> requirement. A mismatch fails every insert and query, and retrieval falls back
> to keyword search without warning.

---

## Deployment

Push to `main` and CI runs lint → typecheck → eval → deploy.

Requires two repository secrets: `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`.

Until those are set, deploy from the machine:

```sh
npm run build && npx nitro deploy --prebuilt
```

---

## Layout

```
src/
  components/site/     page sections + ChatWidget
  content/knowledge/   the chatbot's knowledge base (Markdown)
  routes/api.chat.ts   streaming chat endpoint (SSE)
  routes/api.ingest.ts index rebuild endpoint
  server/
    chat.ts            persona, query condensing, generation
    knowledge.ts       hybrid retrieval + RRF fusion
    ingest.ts          chunking, embedding, index writes
    env.ts             Cloudflare binding resolution
scripts/               asset rendering, résumé extraction, evals
evals/golden.json      the golden set
```
