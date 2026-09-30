# How This Chatbot Works

## The short version

This chatbot is a Retrieval-Augmented Generation system running entirely on
Cloudflare's free tier. When you ask a question, it converts your question into
numbers, finds the passages in Terry's knowledge base that sit closest to those
numbers, and hands them to a language model along with instructions about who
Terry is. The model writes the answer using only what it was handed.

Five Cloudflare services do the storage and search work. **Vectorize** stores
number-vectors for meaning-based search. **D1** stores the passage text and
provides exact-word search. **KV** caches retrieval results and first-turn
answers. **Workers AI** turns text into vectors. **Workers** runs the code that
ties them together. There is no database server and no container.

Generation is a different matter, and it is the part that changed most. A model
provider writes the replies: **OpenRouter** first, **Groq** as a fallback, both
keyed as Worker secrets. The reason is arithmetic rather than taste. Workers AI
has a free allowance of 10,000 units a day, and one generated answer costs
orders of magnitude more of that allowance than one embedding does. Serving
traffic from it meant the corpus rebuild — which needs embeddings — could not
run. Generation moved to a paid provider, and Workers AI now does embeddings
and nothing else. The trade is a per-token cost on a site that would otherwise
be free, against a knowledge base that can actually be updated.

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
| Passages + search | D1 with SQLite FTS5 | Passage text for retrieval, BM25 for keywords |
| Fusion | Reciprocal Rank Fusion, K=60 | Merges rankings without needing comparable scores |
| Generation | OpenRouter, then Groq | Paid tier that is available when free tiers are spent |
| Embeddings | Workers AI | One model, and the only thing drawing on its daily allowance |
| Caching | Cloudflare KV | Retrieval per question, whole answers for first turns |
| Streaming | Server-sent events | Answer text arrives over an open connection |

## How a question is processed

1. **Rate limit check.** Twenty questions a minute per IP, counted per Worker
   isolate and keyed on `cf-connecting-ip`, which the client cannot forge.
2. **Answer cache lookup.** A self-contained first question is looked up in KV by
   question text, corpus version and prompt version. A hit returns immediately
   and costs nothing. Follow-ups are never cached: "tell me more" means nothing
   without the turn before it, and a text-only key would let one visitor's copy
   of it be served to another.
3. **Follow-up resolution.** If there is conversation history, a model rewrites
   the question as a standalone one. "How long was he leading that team?"
   becomes "How long was Terry a team lead at Oracle?" so the search has
   something to match against.
4. **Embedding.** Workers AI converts the resolved question into a
   768-dimension vector.
5. **Hybrid retrieval.** Three searches run: vector similarity, BM25 keyword
   search, and a static trigger table. Their rankings are merged with Reciprocal
   Rank Fusion, which scores each result as `weight / (60 + rank)` and *adds*
   that across every list the result appears in. The accumulation is the entire
   point — a document that all three methods rank highly is corroborated and
   should outrank one that only a single method found.
6. **Passage selection.** Vectorize stores a vector per passage, so the search
   identifies the exact passages that matched and those are what reach the
   model. Returning the whole parent document instead would put every unrelated
   section in the prompt and make chunking improve ranking while doing nothing
   for context precision.
7. **Generation.** The passages, the conversation so far, and a persona prompt
   go to the provider, which writes the answer. If one provider is rate-limited
   the next is tried.
8. **Sources.** The sections actually used are listed underneath the reply.

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
vectors to Vectorize, stores the passage text in D1, and records the document
text and a content hash. Content hashes make it idempotent: running it twice
costs nothing the second time, and a document whose text has not changed is
skipped. `?force=1` rebuilds everything from scratch.

The ingest also reconciles. Upsert only ever adds or replaces, so two kinds of
debris survive it indefinitely: a document whose Markdown file was deleted keeps
its row and its vectors, and a document that shrank keeps the passages past its
new end. Both stay retrievable while being absent from the site. The ingest now
enumerates what the source files actually account for and deletes the rest, and
reports how much it removed — because a cleanup that runs silently is a cleanup
nobody notices is broken.

The knowledge files are bundled at build time, so the ordering is fixed: edit,
deploy, then ingest. Running the ingest before the deploy that carries the new
content loads the old text. CI does all three in that order.

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

**A fusion function was not the one it was named after.** The code said
"Reciprocal Rank Fusion" and the docs repeated it, but the loop kept the largest
contribution from each ranking instead of adding them. A document that all three
search methods found scored exactly the same as one that only a single method
found — there was no consensus boost at all. It was invisible because both
implementations produce plausible-looking orderings, so nothing in a log ever
looked wrong. It was only found by writing down what RRF actually does and
checking the arithmetic against it. A comment asserting a property is not the
property.

**Passages were found and then thrown away.** Vectorize stores a vector per
chunk, so the search identified the right passage and then handed the model the
entire parent document. Chunking improved ranking and did nothing for context
precision; every unrelated section in the file consumed prompt space. This one
had the extra sting of the documentation claiming "the top passages" while the
code did the opposite.

**The answer cache could serve one visitor another visitor's reply.** The key was
the question text alone. A follow-up like "tell me more" is not self-contained —
its answer depends entirely on the turn before it — so one visitor's "tell me
more" was served to anyone else who asked it. If an answer ever echoed a
supplied name or email, the cached copy would have handed one visitor another
visitor's details. Only self-contained first turns are cached now, and the key
carries a prompt version so a reworded instruction cannot keep serving answers
written under the old one.

**Deleted content stayed answerable.** Ingestion only ever upserted. Removing a
Markdown file left its row, its vectors and its passages in place, so the
chatbot kept answering from a project that was no longer on the site. A document
that shrank kept every passage past its new end. Both are now reconciled on each
ingest, and the count of removals is reported rather than assumed.

**The chatbot was starving its own corpus.** Generation ran on Workers AI as a
last-resort tier, and the test suite fires twenty questions per deploy. When the
free provider was rate-limited, every one of those fell through to it. One
generated answer costs orders of magnitude more of the daily allowance than one
embedding does, so a handful of fallback answers exhausted the budget and the
corpus could not be rebuilt — the knowledge base could not be updated because the
chatbot had been answering questions. Workers AI now does embeddings and nothing
else.

**A test that measured the old release.** The evaluation suite ran before the
deploy, against the live site, which meant it scored the version already running
and never the change being shipped. A green run said nothing about the commit
under review. It runs after the deploy now, against the code it is meant to
measure.

**A hard-coded free limit in two places.** The conversation-length caps were
configured once and applied in one of the two routes that accepted a
conversation. The route the site actually used cast the browser's array
straight through, so the limits were configuration that did nothing. Three
overlapping settings for one control is how that happened.

**A truthful metric that broke a measurement.** Cache hits were reported as
`retrievalMode: static, generation: none`, because that is literally what
happens — no model ran. It also made the evaluation suite score healthy cache
reads as provider outages, and the sources list was not replayed, so the
interface lost them. Reporting the cache as a degraded retrieval was the least
honest possible way to describe a fast, correct answer.

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

Storage stays on Cloudflare. No vector database to run, and the corpus is small
enough to fit comfortably inside the free tier.

Generation does not, and the reason is worth stating plainly. The first version
served every answer from the free tier and claimed that was the design. It held
right up until the two free allowances ran out on the same evening, and the
site spent the rest of the day returning raw passages with a note that the
assistant was unavailable. Keeping a system on free tiers is not free; it is a
system whose availability is set by someone else's quota. Moving generation to a
paid tier bought a small, bounded, predictable cost and an assistant that works
at nine at night.

The model name appears in exactly one place in the configuration, because a
retired model id silently broke generation once already.

Simplicity where it does not show. The pieces that survive are the ones that
earned their complexity by failing without them.
