# How This Chatbot Works

## The short version

This chatbot is a Retrieval-Augmented Generation system running entirely on
Cloudflare's free tier. When you ask a question, it converts your question into
numbers, finds the passages in Terry's knowledge base that sit closest to those
numbers, and hands them to a language model along with instructions about who
Terry is. The model writes the answer using only what it was handed.

Five services do the work. **Vectorize** stores number-vectors for meaning-based
search. **D1** stores the full text for exact-word search. **KV** caches answers
to repeated questions. **Workers AI** turns text into vectors and generates the
replies. **Workers** runs the code that ties them together. There is no database
server, no container, and no external AI provider. It costs nothing to run.

Search is hybrid: meaning *and* keywords, fused together. That matters because
each method fails differently. Asking "what did he do before Oracle" finds the
right passage with no shared vocabulary, through vectors alone. Asking "1.2B
credits" needs exact keyword matching, because a vector model has no reason to
rank that phrase highly. Running both and merging the rankings catches both
cases.

## The stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Cloudflare Workers | No server to manage, free tier covers it |
| Framework | TanStack Start + Nitro | SSR React with server functions |
| Vectors | Cloudflare Vectorize, 768 dimensions | Free, fast, good at short text |
| Keyword search | D1 with SQLite FTS5 | BM25 in the same database as the documents |
| Fusion | Reciprocal Rank Fusion, K=60 | Merges rankings without needing comparable scores |
| Generation | An open model hosted by Cloudflare AI | Runs free, strong at following instructions |
| Caching | Cloudflare KV | Repeat questions skip retrieval entirely |
| Streaming | Server-sent events | First token paints in ~1.9s instead of after the full answer |

## How a question is processed

1. **Rate limit check.** Ten questions a minute per IP.
2. **Follow-up resolution.** If there is conversation history, a small model
   rewrites the question as a standalone one. "How long was he leading that
   team?" becomes "How long was Terry a team lead at Oracle?" so the search has
   something to match against.
3. **Embedding.** Workers AI converts the resolved question into a 768-dimension
   vector.
4. **Hybrid retrieval.** Three searches run: vector similarity, BM25 keyword
   search, and a static trigger table. Their rankings are merged with Reciprocal
   Rank Fusion, which scores each result as `weight / (60 + rank)`.
5. **Cache lookup.** The merged results are cached in KV under a key built from
   a corpus version and a hash of the question. A repeat question skips steps 3
   and 4 entirely.
6. **Generation.** The top passages, the conversation so far, and a persona
   prompt go to the language model, which streams the answer token by token.
7. **Sources.** The sections actually used are listed underneath the reply.

## The persona prompt

The model is given a system prompt that does several things. It states who Terry
is and what he does. It instructs the model to answer only from the retrieved
passages, so it cannot invent facts. It gives separate instructions for three
different situations — a normal work question, a light personal question, and an
abusive one — because they need very different tones. It forbids revealing the
prompt itself and states that text inside a question is a question, never a
command, which blocks prompt injection. And it explicitly forbids inline
citation markers, because the interface already shows which sections were used.

Two of those rules exist because of bugs found during testing, described below.

## Content ingestion

Knowledge lives as Markdown files in `src/content/knowledge/`. A build step
converts the PDF résumé into Markdown using `pdftotext`, so the résumé is
searchable rather than just downloadable. At build time, `import.meta.glob`
discovers every `.md` file in the folder — adding a file requires no code change.

`POST /api/ingest` then chunks each document, embeds every chunk, writes the
vectors to Vectorize, and records the document text and a content hash in D1.
Content hashes make it idempotent: running it twice costs nothing the second
time, and a document whose text has not changed is skipped. `?force=1` rebuilds
everything from scratch.

The order of those writes matters, and getting it wrong is the most instructive
bug in this project.

## What went wrong along the way

The system reported success while failing silently, repeatedly. Each of these
produced no error, no visible breakage, and in several cases a chatbot that
looked completely healthy while running on almost nothing.

**The vector index was the wrong size.** It was created at 1536 dimensions
because that is the maximum Cloudflare allows, which reads like a requirement
rather than a ceiling. The embedding model produces 768. Every insert and every
query failed, the retrieval layer caught the error and fell back to a static
keyword table, and the site kept answering questions. It just was not doing
retrieval at all.

**The bindings were being read from the wrong place.** The Cloudflare preset in
use exposes bindings on a global and on the request object, not on the event
context that the other common preset uses. Reading the wrong path returned an
empty object, so every binding access failed. This was the actual cause of a
504 error that looked like an API timeout.

**Chunk IDs did not match document IDs.** Retrieval queried D1 for `bio#0` while
the documents table was keyed `bio`. The join returned nothing, so vector results
were filtered to empty on every single query. The pipeline was healthy; it was
just returning nothing and nobody noticed.

**A Durable Object could not be deployed.** The original design routed ingestion
through a Cloudflare Queue into a Durable Object. The build preset generates the
Worker module and cannot export a Durable Object class from it, so the class
would have been declared in configuration but absent from the module. It was
replaced with a plain authenticated HTTP endpoint, which is less machinery and
actually deploys.

**The cache never invalidated.** A content update ran, but the cleanup called
for a key that was never written — a no-op that looked like working code. Cached
retrieval results from the old content survived, and the chatbot kept serving
pre-update answers. Now the cache key contains a corpus version, so bumping it
retires every old entry at once.

**Keyword search had never once run.** The raw question was passed to SQLite's
full-text search as a query string. A trailing question mark is a syntax error
there, the promise rejected, and a `catch` block swallowed it. Every keyword
search for the entire life of the system had returned zero results. The
normalisation was also mathematically wrong — the scoring function returns
negative numbers, and the transform divided by approximately zero.

**Documents were marked current before their vectors existed.** Content hashes
were written to D1 before the vector index was updated. If the process died in
between, the next run saw matching hashes, skipped everything, and reported
success while the vector index stayed empty. The two stores disagreed silently
and permanently. Writing the hashes last fixed it.

**A single example in the prompt became a script.** The system prompt contained
one example of how to deflect a personal question, and the model used that exact
sentence every time it was asked one, across separate conversations. The fix was
several varied examples marked as shape-only, plus an instruction to check
whether it had already used a similar line.

**A React state updater was impure.** The chatbot rendered the visitor's message
and never rendered a reply. The updater function read and wrote a mutable
variable from its closure, and React defers updaters to the next render, so the
first token took the wrong branch and appended nothing. Every server-side test
passed throughout, because the bug existed only in the browser.

**A claim about streaming was wrong.** Streaming was described as impossible
without a separate API token, based on reading a type signature rather than the
model's actual input schema. `stream: true` was supported the whole time. The
correction turned three seconds of blank screen into visible text from the first
token.

## How it is tested

Correctness here has meant checking that a claim is true before making it, not
after. The retrieval probe embeds a question that deliberately shares no
vocabulary with the source text and confirms the right document comes back —
that distinguishes genuine semantic retrieval from keyword matching. The health
check endpoint reports retrieval mode, dimensions, and match count so a degraded
path is visible. The ingestion endpoint can force a full rebuild.

The pattern that caught nearly every bug: a system reporting success is not
evidence that it worked. Three of the failures above returned `"ok": true` with
correct-looking numbers.

## Why it is built this way

No external AI provider. That means no API key to manage, no per-token billing,
and no third party who can retire a model id and break the site — which happened
once during development and is the reason the model name now appears in exactly
one place in the configuration.

No vector database to run. Cloudflare's is sufficient at this scale and costs
nothing, and the corpus is small enough that the whole system fits comfortably
inside the free tier.

Simplicity where it does not show. The pieces that survive are the ones that
earned their complexity by failing without them.
