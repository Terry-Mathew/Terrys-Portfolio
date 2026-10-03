// RAG chat backend config (Cloudflare-native).
// mode: "static" = deterministic keyword retrieval over bundled knowledge —
// zero AI cost, works on first deploy with no Vectorize/R2 setup.
// mode: "vector" = semantic search via Vectorize + OpenRouter generation.
// Flip to "vector" after creating Vectorize index + KV namespace + D1
// and adding bindings in wrangler.jsonc.

export const CHAT_CONFIG = {
  mode: "vector" as "static" | "vector",

  // Generation.
  //
  // OpenRouter is the only generation provider. Workers AI remains in use for
  // embeddings. When OpenRouter fails, the chat uses its extractive fallback.
  //
  // Workers AI is embeddings-only.
  //
  // It used to be the last generation tier, and that is what starved the corpus
  // rebuild. One LLM answer costs orders of magnitude more of the 10,000
  // neurons/day than one query embedding, so a handful of fallback answers —
  // the eval suite fires twenty per deploy and every one of them lands here
  // when OpenRouter is capped — exhausts the day and the ingest cannot run.
  // That is the 4006 error.
  //
  // With this off, those neurons serve retrieval and nothing else. If
  // OpenRouter fails, the chat uses the extractive fallback.
  useWorkersAiGeneration: false,

  // OpenRouter. Secret is OPENROUTER_API_KEY.
  //
  // PINNED, deliberately. This used to be "openrouter/free", which is a
  // routing alias rather than a model: OpenRouter picks whatever backs it and
  // can change that without notice or a release here. Two consequences, both
  // observed:
  //   - Persona discipline moved without a commit. The instruction that this
  //     project cannot bend is "never invent a fact about Terry", and that is
  //     exactly the instruction a swapped model breaks first.
  //   - It governs TOOL CALLING too, not just prose. `generateWithTools`
  //     reuses `openRouterModel`, so the alias decided lead capture as well.
  //
  // GPT-5 Mini handles answers, tool calls, and follow-up rewrites. The public
  // catalogue advertises tools and a 400k context. A live tool round trip and
  // the portfolio evaluation are still required before deployment.
  useOpenRouter: true,
  openRouterModel: "openai/gpt-5-mini",
  openRouterCondenseModel: "openai/gpt-5-mini",

  // Retained for a possible rollback. Disabled for all chat paths.
  useGroq: false,
  groqModel: "qwen/qwen3.8-27b",

  // Opt-in premium prose. Off by default: it is a paid key, and a retired
  // model id would break it silently.
  useAnthropic: false,
  anthropicModel: "claude-sonnet-4-5",

  // Llama 3.3 70B Instruct: strongest model on the Workers AI free tier.
  // Costs roughly 2x the 17B in neurons and adds latency, but the corpus is now
  // large enough (~9k chars) that model quality actually shows.
  // Alternatives:
  //   "@cf/meta/llama-4-scout-17b-16e-instruct"   faster, ~4k answers/day
  //   "@cf/meta/llama-3.1-8b-instruct-fp8"        fastest, ~8k answers/day
  generationModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",

  // Embeddings. Must match CHAT_CONFIG.dimensions and the Vectorize index.
  embeddingModel: "@cf/baai/bge-base-en-v1.5", // 768 dims
  dimensions: 768,

  vectorizeIndex: "terry-kb",

  // Bump whenever the knowledge corpus changes in a way that alters what
  // retrieval should return. It is folded into the KV cache key, so bumping it
  // orphans every cached result instantly. KV has no tag invalidation, and
  // deleting "rag:query:all" was silently a no-op — which meant a content
  // update kept serving pre-update retrieval.
  //
  // WHEN TO BUMP: any time you edit, add, or delete a file in
  // src/content/knowledge/ — or replace public/Terry-Mathew-CV.pdf.
  // HOW: increase the number, then rebuild, deploy, and re-run /api/ingest.
  // Without the bump, a question asked yesterday returns yesterday's answer.
  //
  // 5 → 6: the knowledge corpus changed. `facts.md` was added as the canonical
  // facts layer and bio, experience, work, skills, experiments and the
  // architecture docs were rewritten against it. The document hashes already
  // force a re-embed of every edited file, but the retrieval and answer caches
  // are keyed on the corpus version and store the text that was retrieved, so
  // without this the chatbot keeps serving the pre-edit biography for up to
  // cacheTTL — which is how a question about Terry's current employer could
  // return an answer that is a month out of date.
  // 6 → 7: the knowledge corpus was replaced from the supplied canonical bundle.
  // Every one of the eight documents changed in its *body* — the text that is
  // chunked, embedded, written to D1 and matched by BM25 — with frontmatter
  // excluded, so this is a content bump and not a metadata-only one. Verified
  // by comparing the parsed body of each file against HEAD rather than assuming
  // it, because the whole point of excluding frontmatter from the hash is that
  // adding a title must not cost a re-embed. Here the prose did change: the
  // Oracle role is described as current employment with a planned final working
  // day of 14 October 2026, and the Digital Twin architecture was corrected to
  // match the implementation.
  // 7 → 8: indexed architecture notes now describe the GPT-5 Mini setup.
  corpusVersion: 8,
  // The corpus is now ~12 documents, so ranking finally has something to do.
  // 8 candidates per method in, 4 chunks out.
  topK: 8,
  rerankTopK: 4,
  // Documents are longer now, so chunks can be larger before losing focus.
  chunkSize: 900,
  chunkOverlap: 120,
  // Abuse guard, per IP. Ten a minute blocked a visitor asking six legitimate
  // follow-ups, and any bulk caller (the eval suite) tripped it immediately.
  // Twenty a minute is still a hard stop on scraping while allowing a real
  // conversation to run without a wall.
  rateLimitPerMinPerIp: 20,
  cacheTTL: 86400, // 24 hours

  // Conversation. Follow-ups like "how long was he a lead?" are meaningless
  // without the previous turns, so recent history is sent with the question and
  // the follow-up is rewritten into a standalone question before retrieval.
  //
  // The history limits live in `security` below, not here. They are a security
  // control, not a conversation preference, and having them in two places is how
  // the SSE route ended up shipping without them.
  // Question condensing runs on the OpenAI-compatible tiers. There is no
  // Workers AI fallback: it draws on the same 10,000 neurons/day the ingest
  // needs, and an LLM call costs orders of magnitude more of that budget than
  // an embedding. Losing it means pronouns in a follow-up resolve less well
  // during an outage; the question is still answered, just retrieved on the raw
  // words.

  // Sampling. These target verbatim echo: the model copying a phrase from the
  // system prompt or from its own previous turn. All three are supported on the
  // llama-3.3-70b messages schema in @cloudflare/workers-types.
  temperature: 0.7,
  // Penalises tokens already present in the context — the direct lever on
  // "the model keeps saying the same line".
  frequencyPenalty: 0.4,
  // Nudges toward unused vocabulary. Keep small; too high and answers drift off
  // the retrieved context.
  presencePenalty: 0.3,
  // Multiplicative, 1.0 is neutral. Catches whole repeated sequences that a
  // per-token penalty can miss.
  repetitionPenalty: 1.1,

  fallbackEmail: "terry.perangat@gmail.com",

  // Lead capture uses the same OpenRouter model as answers.
  useTools: true,

  // A model can loop call -> reject -> call. Three iterations is one retry plus
  // a final answer before falling through to a neutral reply.
  maxToolIterations: 3,

  /**
   * Provider budgets, all comfortably inside the 30s the browser waits.
   *
   * A turn can spend condensing, then generation, then another generation after
   * a tool call. At 30s each, a slow follow-up could run past the client's abort
   * and the visitor would see "Something went wrong" for an answer that had
   * already been produced server-side. Sums to well under the limit, and each
   * tier is abandoned fast enough that the next one still fits.
   */
  toolTimeoutMs: 12000,
  generationTimeoutMs: 15000,
  condenseTimeoutMs: 5000,

  notifications: {
    enabled: true,
    // Models fire record_user_details eagerly, on the first "tell me about
    // yourself". Requiring a real note first is the cheapest guard.
    minNotesLength: 20,
    // Per-IP ceilings, backed by KV. Without these one visitor can fill the
    // phone in under a minute.
    maxContactsPerIpPerHour: 1,
    maxUnknownPerIpPerHour: 3,
  },

  // Input handling. Blocked keywords are logged, never pushed — they are one
  // word to type, so notifying on them is a spam button.
  security: {
    maxInputLength: 500,
    /**
     * The client sends the whole conversation, so it is attacker-controlled
     * input. Without these caps a single request can put megabytes into the
     * condensing and generation prompts — and input tokens are billed, which
     * makes this a cost attack as much as a robustness one.
     */
    maxHistoryMessages: 12,
    maxHistoryItemLength: 800,
    blockedKeywords: [
      "ignore previous",
      "ignore all",
      "system prompt",
      "jailbreak",
      "disregard your",
    ],
  },

  /**
   * Answer cache. Retrieval results are already cached in KV; without this the
   * same question re-pays for generation every time it is asked, which is the
   * common case on a portfolio where visitors ask the same handful of things.
   *
   * Keyed on the raw question, not the condensed one, so a hit costs nothing —
   * checking a condensed key would mean paying for the rewrite first. That only
   * holds for a self-contained first turn, so follow-ups are never cached: their
   * meaning depends on the turn before them, and a text-only key would let one
   * visitor's "tell me more" serve another's answer.
   *
   * promptVersion changes whenever the system prompt changes. Without it, a
   * reworded instruction would keep serving answers written under the old one
   * for the rest of the TTL. Bump it by hand; it costs one character.
   *
   * Only successful generations are stored. Caching a degraded extractive reply
   * would turn one bad minute into a 24-hour one.
   */
  answerCache: {
    enabled: true,
    ttlSeconds: 86400,
  },
  // 2 → 3: the answer-format contract changed. The prompt now forbids Markdown
  // emphasis, link syntax, backticks and code fences, and the widget renders
  // safe links and addresses itself. Without a bump, every answer cached under
  // the old instructions would keep serving the Markdown version — and the
  // answer cache outlives a deploy, so the fix would look like it had not
  // landed at all.
  // 3 → 4: the pinned generation model changed. Retire answers from Sonnet.
  promptVersion: 4,
} as const;
