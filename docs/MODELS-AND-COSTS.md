# Model and Cost Reference

Operational reference for the chatbot's AI costs. Read this before changing a
model id in `src/server/chat.config.ts`.

## What this system actually spends money on

**One line item: the generation provider.** Everything else is inside a free
tier.

| Component  | What it does                               | Cost                 |
| ---------- | ------------------------------------------ | -------------------- |
| Workers    | The Worker itself, and the streaming route | free tier            |
| Vectorize  | Chunk embeddings                           | free tier            |
| D1         | Documents, passages, FTS5 index            | free tier            |
| KV         | Answer cache, retrieval cache, status flag | free tier            |
| Workers AI | **Embeddings only**                        | free allowance       |
| OpenRouter | Generation, and the tool-calling pass      | **paid, ~3¢/answer** |
| Groq       | Generation and tool-calling backup         | free                 |

## Workers AI: embeddings only

The Workers AI free allowance is **10,000 neurons per day**, which is worth
about **$0.20 of inference**. It is a hard stop, not a throttle: once
exhausted, every call fails with `AiError 4006` and the chatbot serves
extractive answers until 00:00 UTC.

Neuron maths:

```
neurons = (input_tokens / 1_000_000 × price_in)
        + (output_tokens / 1_000_000 × price_out)
        ÷ 0.00002
```

`@cf/baai/bge-base-en-v1.5` (768-dim embeddings) costs roughly 2 neurons per
call, so the whole corpus can be re-embedded many times over before the day is
meaningfully spent.

> **Generation was removed from Workers AI deliberately.**
> `useWorkersAiGeneration: false`. It used to be the last tier in the chain, and
> that is what starved the corpus rebuild. One LLM answer costs orders of
> magnitude more neurons than one query embedding, so the eval suite alone —
> twenty answers per deploy — exhausted the day, the ingest could not run, and
> retrieval quietly degraded to the keyword path. The cost of removing it is
> that when OpenRouter and Groq both fail the chat drops to the extractive
> fallback rather than trying Workers AI. That is the better failure: a
> labelled, correct answer beats an unlabelled one that cost the embeddings.

## Generation: what is actually configured

| Role                             | Model                                        | Cost           |
| -------------------------------- | -------------------------------------------- | -------------- |
| Retrieval embeddings             | `@cf/baai/bge-base-en-v1.5` (768 dim)        | free allowance |
| Follow-up question rewriting     | `anthropic/claude-haiku-4.5` via OpenRouter  | ~$0.00002      |
| Answer generation + tool calling | `anthropic/claude-sonnet-4.5` via OpenRouter | ~$0.03/answer  |
| Generation backup                | `qwen/qwen3.8-27b` via Groq                  | free           |

Anthropic's own API is available behind `useAnthropic: false`. It is off
because it is a second paid key and a second retired-id failure mode, and
nothing here needs it.

## Why these ids, and why pinned

**Pinned to specific ids, not aliases.** This used to be `openrouter/free`,
which is a routing alias rather than a model: OpenRouter decides what backs it
and can change that without notice. Because `generateWithTools` reuses the same
id for lead capture, a silent swap changed how leads were captured as well as
how prose read — and nothing looked broken, because the chatbot kept answering.

**Sonnet for the model that has to be reliable.** This project's own history
records Gemini Flash, Llama 3.3 and Nemotron all failing or rate-limiting on
structured tool calls. Lead capture depends on the model reliably emitting a
valid tool call with valid JSON arguments; that is worth paying for.

**Haiku for condensing.** Rewriting a follow-up into a standalone question is a
20-word rewrite against a short transcript. Sonnet rates buy nothing there, and
keeping it in one provider family keeps the failure modes predictable.

## Cost per answer

Per-million-token prices from OpenRouter:

| Model                               | Input | Output |
| ----------------------------------- | ----- | ------ |
| `anthropic/claude-haiku-4.5`        | $1.00 | $5.00  |
| `anthropic/claude-sonnet-4.5`       | $3.00 | $15.00 |
| `google/gemini-2.5-flash`           | $0.30 | $2.50  |
| `meta-llama/llama-3.3-70b-instruct` | $0.10 | $0.32  |

Assuming **8,000 input tokens** and **250 output tokens** per turn — the input
is dominated by the ~900-token system prompt plus `rerankTopK: 4` passages plus
capped conversation history:

| Model               | $/answer | 100 answers/mo | 1000 answers/mo |
| ------------------- | -------- | -------------- | --------------- |
| `gemini-2.5-flash`  | $0.003   | $0.30          | $3.00           |
| `gpt-4.1-mini`      | $0.004   | $0.40          | $4.00           |
| `claude-sonnet-4.5` | $0.028   | $2.80          | $28.00          |

A turn that captures a lead runs the model twice — once to emit the tool call,
once to answer after the tool result — so roughly double that.

**These are arithmetic on an assumed token count, not measurements.** Real usage
runs higher because some answers are long and multi-turn requests carry the
conversation. Budget for roughly double.

## Before you change an id

```bash
npm run verify:models                     # catalogue checks, no key needed
OPENROUTER_API_KEY=… npm run verify:models # + streaming and a tool round trip
npm run eval                              # diff the golden set
```

`verify:models` checks that the id exists, advertises tool support, and has a
context window larger than a real turn — then, with a key, actually calls it:
streaming frames, three tool-call attempts for JSON argument reliability, and
the condensing rewrite.

## Levers that reduce cost without changing model

1. **The answer cache** already removes generation for repeat first turns.
   Follow-ups are never cached — their meaning depends on the turn before them.
2. **Prompt length.** The system prompt is ~900 tokens on every request.
   Trimming it has a direct, proportional effect on every answer's cost.
3. **`rerankTopK`.** Currently 4. Each chunk adds roughly 400–900 characters of
   context. Dropping to 3 cuts input by about a quarter.
4. **`max_tokens`** is 1024. Most answers are far shorter.

## If the cost becomes the binding constraint

Drop `openRouterModel` to `google/gemini-2.5-flash` — about 10× cheaper at
similar retrieval quality — **and re-run `npm run verify:models` with the key.**
Gemini is in this project's record as unreliable on structured tool calls, so
swapping it in without checking the tool round trip risks losing lead capture
while nothing looks broken.

The better lever at that volume is Workers Paid ($5/month), which removes the
daily embedding ceiling and keeps every model id above.
