// RAG chat backend config (Cloudflare-native).
// mode: "static" = deterministic keyword retrieval over bundled knowledge —
// zero AI cost, works on first deploy with no Vectorize/R2 setup.
// mode: "vector" = semantic search via Vectorize + LLM generation via Workers AI / Anthropic.
// Flip to "vector" after creating Vectorize index + KV namespace + D1
// and adding bindings in wrangler.jsonc.

export const CHAT_CONFIG = {
  mode: "vector" as "static" | "vector",

  // Generation.
  //
  // Provider order is OpenRouter -> Groq -> Workers AI. Both free tiers were
  // observed exhausted on the same evening (Workers AI 10k neurons/day, Groq
  // 200k tokens/day), which pushed visitors onto the extractive fallback for
  // most of the day. OpenRouter is OpenAI-compatible like Groq, so the call
  // path is identical and the credit balance turns the tail of the day back
  // into real answers.
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
  // With this off, those neurons serve retrieval and nothing else, so only the
  // work that actually needs them can spend them. The cost is that when
  // OpenRouter and Groq both fail, the chat drops straight to the extractive
  // fallback instead of trying Workers AI — which is where it was heading
  // anyway, just after destroying the embedding budget.
  useWorkersAiGeneration: false,

  // Tier 1. OpenRouter. Secret is OPENROUTER_API_KEY.
  //
  // "openrouter/free" is a routing alias: OpenRouter decides which free models
  // back it, and that choice can change without notice. That is a feature here
  // (it self-heals to whatever is currently good) but it does mean the model
  // behind the id is not pinned. For deterministic behaviour, replace it with
  // a specific id and verify tool support at openrouter.ai before relying on it.
  useOpenRouter: true,
  openRouterModel: "openrouter/free",
  // A second slot for question condensing, so the same routing alias can be
  // pointed at a smaller/faster model without touching the chat model. Leave
  // empty to reuse openRouterModel.
  openRouterCondenseModel: "",

  // Tier 2. Groq, also OpenAI-compatible, free, no daily neuron cap. Stays the
  // tool-calling backup behind OpenRouter. Free tiers rotate without notice —
  // verify the id at console.groq.com/docs/models.
  useGroq: true,
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
  corpusVersion: 4,
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

  // Lead capture.
  //
  // Tool calling runs on Groq, not on Workers AI: this project's own history
  // records Gemini Flash, Llama 3.3 and Nemotron all failing or rate-limiting
  // on structured tool calls. Groq is OpenAI-compatible and reliable. If Groq
  // is unavailable the chat still answers — it just does not capture leads.
  useTools: true,

  // A model can loop call -> reject -> call. Three iterations is one retry plus
  // a final answer before falling through to a neutral reply.
  maxToolIterations: 3,

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
   * checking a condensed key would mean paying for the rewrite first.
   *
   * Only successful generations are stored. Caching a degraded extractive reply
   * would turn one bad minute into a 24-hour one.
   */
  answerCache: {
    enabled: true,
    ttlSeconds: 86400,
  },
} as const;
