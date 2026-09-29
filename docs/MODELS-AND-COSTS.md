# Model and Neuron Reference

Operational reference for the chatbot's AI costs. Read this before changing
`generationModel` in `src/server/chat.config.ts`.

## The budget

| | |
|---|---|
| Free allowance | **10,000 neurons per day** |
| 1 neuron | $0.00002 |
| Free allowance value | $0.20 of inference per day |
| Reset | 00:00 UTC (05:30 IST) |

The allowance is per day, per account. It is a hard stop, not a throttle:
once exhausted, every generation call fails with `AiError 4006` and the
chatbot serves extractive answers until midnight UTC.

## Neuron maths

```
neurons = (input_tokens / 1_000_000  × price_in)
        + (output_tokens / 1_000_000 × price_out)
        ÷ 0.00002
```

## Model pricing

Prices are per million tokens, from the Cloudflare Workers AI catalogue.

| Model | Input | Output |
|---|---|---|
| `@cf/meta/llama-3.2-3b-instruct` | $0.051 | $0.335 |
| `@cf/meta/llama-3.1-8b-instruct-fp8` | $0.152 | $0.287 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | $0.270 | $0.850 |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | $0.293 | $2.253 |

`@cf/baai/bge-base-en-v1.5` (embeddings) and `@cf/meta/llama-3.2-3b-instruct`
(used only to rewrite follow-up questions) are cheap enough that their cost is
noise: roughly 2 neurons per call.

## Cost per answer

Assume **3,000 input tokens** and **200 output tokens** per answer. The input
figure is dominated by the system prompt, which is around 900 tokens, plus
retrieved chunks.

| Model | $/answer | Neurons/answer | Answers/day (free) |
|---|---|---|---|
| `llama-3.1-8b-fp8` | $0.00051 | ~26 | ~385 |
| `llama-4-scout-17b` | $0.00098 | ~49 | ~204 |
| `llama-3.3-70b-fp8-fast` | $0.00133 | ~66 | ~150 |

**These are arithmetic on an assumed token count, not measurements.** Real
usage ran materially higher because some answers are long and multi-turn
requests carry the conversation. Budget for roughly half these numbers.

To measure for real: note the neuron balance in the Cloudflare dashboard, send
ten known-length questions, and read the difference.

## What is currently configured

| Role | Model |
|---|---|
| Retrieval embeddings | `@cf/baai/bge-base-en-v1.5` (768 dimensions) |
| Follow-up question rewriting | `@cf/meta/llama-3.2-3b-instruct` |
| Answer generation | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |

The 70B is the most expensive model in the catalogue by output price, at more
than twice the 17B. It was chosen for instruction adherence, not because the
task is hard. If the daily allowance becomes the binding constraint, drop to
`llama-4-scout-17b` for roughly 35% more answers, or to
`llama-3.1-8b-fp8` for roughly 2.5 times as many.

## Levers that reduce cost without changing model

In rough order of impact:

1. **The KV semantic cache** already removes retrieval for repeat questions. A
   portfolio gets a long tail of unique questions, so this helps but does not
   dominate.
2. **Prompt length.** The system prompt is ~900 tokens on every single request.
   Trimming it has a direct, proportional effect on every answer's cost.
3. **`rerankTopK`.** Currently 4. Each chunk adds roughly 400–900 tokens of
   context. Dropping to 3 cuts input by about a quarter.
4. **Answer length.** `max_tokens` is 1024. Most answers are far shorter, and
   output is the expensive axis on the 70B.

## Options beyond the free tier

- **Workers Paid ($5/month)** removes the daily ceiling.
- **An external provider** (Anthropic, OpenAI, Zhipu for GLM) gives access to
  closed-weights models. This adds a credential and a new failure mode, and
  none of those models are available through the Workers AI catalogue. Only
  worth it if answer quality is demonstrably the limiting factor.

## Why the free tier is not currently a problem

A portfolio site receives a small number of questions. The extraction fallback
means a bad day produces less fluent answers rather than a broken chatbot. The
cost only becomes real if the site gets traffic, at which point $5/month is not
a meaningful decision.
