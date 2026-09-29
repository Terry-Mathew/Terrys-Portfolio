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
  // Workers AI is the default and the only path needed. The free tier
  // (100k neurons/day) covers ~4k answers/day here, which is far more than a
  // portfolio site needs.
  //
  // Set useAnthropic to true only if you want stronger prose and accept a
  // paid key plus the risk of a retired model id breaking it silently.
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
  corpusVersion: 3,
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
  historyTurns: 6, // messages (not turns) kept — 3 exchanges
  condenseModel: "@cf/meta/llama-3.2-3b-instruct", // cheap; rewriting is a small task

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
} as const;
