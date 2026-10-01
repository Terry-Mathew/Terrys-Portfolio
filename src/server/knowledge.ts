// Knowledge retrieval layer supporting both static and vector modes.
// Static mode: keyword search over bundled KNOWLEDGE array (zero backend).
// Vector mode: semantic search via Cloudflare Vectorize + D1 metadata + KV cache.

import type { CloudflareEnvShape } from "@/server/env";

type KnowledgeChunk = {
  id: string;
  anchor: string;
  triggers: string[];
  answer: string;
};

export type RetrievalResult = {
  id: string;
  anchor: string;
  title: string;
  content: string;
  score: number;
  /**
   * Where this result came from, and it is not a synonym for "was it a cache
   * hit".
   *
   * A retrieval-cache hit is still a vector result — the query was run, by an
   * earlier turn, against the same index. Overwriting the source with "cache"
   * destroyed that fact, and the only way a consumer could then tell a healthy
   * cached retrieval from a genuine fallback to the keyword table was that the
   * first was fast. So a deployment check reading `static` on a fully working
   * index was indistinguishable from a real outage, and the availability dot
   * said "Limited mode" while answers were perfectly good.
   *
   * Cache provenance belongs in `fromCache`, where it can be reported without
   * erasing what produced the result. The two are now independent: any
   * combination of source and fromCache is meaningful.
   */
  source: "static" | "vector" | "bm25";
  /** True when this result was replayed from the KV retrieval cache rather
   *  than re-queried this turn. False or absent means it was computed live. */
  fromCache?: boolean;
};

type Env = Required<Pick<CloudflareEnvShape, "VECTORIZE" | "DB" | "CACHE" | "AI">>;

// Static knowledge base (fallback / zero-setup mode)
export const KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: "bio",
    anchor: "#about",
    triggers: ["who", "about", "bio", "background", "terry", "yourself", "pillars", "role"],
    answer:
      "Terry Mathew is a Product, Data & AI builder with 8+ years across analytics, enterprise platforms and product management. He turns complex business problems into products, data systems and decision tools people can actually use. Pillars: Product Strategy, Data Products, AI Prototyping, Analytics, Business Systems.",
  },
  {
    id: "oracle",
    anchor: "#experience",
    triggers: [
      "oracle",
      "experience",
      "work history",
      "career",
      "job",
      "timeline",
      "team lead",
      "analyst",
    ],
    answer:
      "Terry spent 8.5 years at Oracle: Senior Data Product Manager for Partner Analytics (2024–2026), Insights Analyst II for Partner Insights & Revenue Operations (2023–2024), Business Operations Team Lead for EMEA Operations leading 20 people on 20k+ transactions/quarter and cutting turnaround from 20 days to 3–4 (2022–2023), Business Operations Specialist (2021–2022), and Business Operations Analyst (2018–2021). Before Oracle: HR, IT Support, Retail, Hospitality.",
  },
  {
    id: "work",
    anchor: "#experience",
    triggers: [
      "work",
      "case stud",
      "partner systems",
      "analytics",
      "reports",
      "decisions",
      "portfolio",
    ],
    answer:
      "Partner systems work at Oracle: (1) Global Partner Systems — turned fragmented partner operations into usable systems; (2) Trusted Partner Analytics — one shared metrics model and vocabulary for reviews and planning; (3) From Reports to Decisions — self-serve answers for recurring questions. Enterprise details are intentionally limited — ask over email.",
  },
  {
    id: "projects",
    anchor: "#experiments",
    triggers: ["project", "projects", "side project", "building", "portfolio", "build"],
    answer:
      "Four projects. Digital Twin — a serverless AI persona on this site that answers questions and captures verified leads (live). Product Discovery AI — a CrewAI multi-agent system for competitor research, customer-pain mining and market sizing (working prototype). Deep Research Agent — an autonomous research pipeline that produces citation-backed reports (in development). Settle — a personal finance decision simulator for exploring debt, savings and purchases (in progress). Each has a full case study at terrymathew.com/projects.",
  },
  {
    id: "settle",
    anchor: "/projects/settle",
    triggers: ["settle", "finance", "money", "debt", "emi", "savings"],
    answer:
      "Settle is a personal finance decision simulator. It connects income, expenses, savings, debts, investments, assets and planned purchases in one picture, so you can see what a decision looks like over time before you make it. It does not give financial advice or tell you what to do — it helps you explore the scenarios.",
  },
  {
    id: "digital-twin",
    anchor: "/projects/digital-twin",
    triggers: [
      "digital twin",
      "chatbot",
      "chat bot",
      "this site",
      "assistant",
      "how does this work",
    ],
    answer:
      "The Digital Twin is the AI persona running on this site. It is a serverless assistant grounded in Terry's biography and work history, so it can answer questions about his experience, projects and skills. It runs on Cloudflare Workers with Vectorize, D1 and Workers AI, uses hybrid retrieval, and is built to capture contact details without letting anyone fabricate them.",
  },
  {
    id: "capabilities",
    anchor: "#capabilities",
    triggers: ["skill", "skills", "stack", "tool", "tools", "technology", "capabilit", "good at"],
    answer:
      "Terry works across four areas. Product: strategy, roadmapping, user research, cross-functional leadership. Data: SQL, analytics, KPI definition, data pipelines, Oracle Analytics Cloud. AI: prompt engineering, multi-agent systems, RAG architecture, AI prototyping, AI ethics. Building: Python, CrewAI, LangChain, Supabase, Vercel, n8n.",
  },
  {
    id: "contact",
    anchor: "#contact",
    triggers: [
      "contact",
      "email",
      "hire",
      "linkedin",
      "instagram",
      "youtube",
      "resume",
      "cv",
      "reach",
      "talk",
    ],
    answer:
      "You can reach Terry at terry.perangat@gmail.com, on LinkedIn (linkedin.com/in/terry-mathew), Instagram (@tedssy), or YouTube (@terrymathew-p). Resume download is in the Experience section.",
  },
];

// Static retrieval (keyword-based)
export function retrieveStatic(question: string, topK = 3): RetrievalResult[] {
  const q = question.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const scored = KNOWLEDGE.map((chunk) => {
    let score = 0;
    for (const t of chunk.triggers) {
      if (q.includes(t)) score += t.length > 5 ? 3 : 2;
    }
    for (const w of words) {
      if (chunk.answer.toLowerCase().includes(w)) score += 1;
    }
    return { chunk, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => ({
    id: s.chunk.id,
    anchor: s.chunk.anchor,
    title: s.chunk.id,
    content: s.chunk.answer,
    score: s.score,
    source: "static" as const,
  }));
}

/**
 * Turn a stored `documents.category` into a link the widget can render.
 *
 * A category is either a section id on the home page ("about") or a path to a
 * real route ("/projects/digital-twin"). Both shapes are needed: `how-this-works`
 * documents a project and has no section anywhere, while `bio` has a section and
 * no page of its own.
 *
 * This previously always prefixed `#`, which turned a route into
 * `#/projects/digital-twin` — a fragment on the current page, not a link to the
 * case study. Two dead source links shipped that way before anything checked
 * that a citation pointed at something real.
 */
export function anchorFor(category: string | null | undefined): string {
  const value = category?.trim();
  if (!value) return "#knowledge";
  if (value.startsWith("/")) return value;
  if (value.startsWith("#")) return value;
  return `#${value}`;
}

/**
 * Did retrieval actually work, as distinct from did it find anything.
 *
 * These are different questions and conflating them is what made a healthy
 * chatbot report itself as broken. A visitor asking "are you single" should
 * match nothing — that is the correct outcome — and the index answering "nothing
 * here" is the index working. Inferring health from the result count cannot tell
 * that apart from an index that is down, so the answer was to report the
 * methods that ran and the methods that failed, and let the caller decide.
 */
export type RetrievalHealth = {
  /** Live, index-backed methods that completed without throwing. */
  ran: ("vector" | "bm25")[];
  /** Live methods that were attempted and threw. Empty on a healthy turn. */
  failed: ("vector" | "bm25")[];
  /** At least one live method ran and none failed. */
  healthy: boolean;
  /** Retrieval ran cleanly and matched nothing. A correct answer, not a fault. */
  empty: boolean;
};

export type RetrievalOutcome = {
  results: RetrievalResult[];
  health: RetrievalHealth;
};

/** A retrieval path that never ran: no bindings, or static mode. */
export function unrunRetrievalHealth(): RetrievalHealth {
  return { ran: [], failed: [], healthy: false, empty: true };
}

/**
 * Decide whether a retrieval turn worked, from what each method did.
 *
 * Split out and exported so it can be tested directly. The whole fix is this
 * distinction, and a test that re-derives the same rule in the test file proves
 * nothing about whether the server applies it.
 *
 * The rule:
 *   - healthy  = at least one live index ran and none of them threw.
 *   - empty    = healthy *and* nothing came back, which is a correct miss for a
 *                question the corpus does not cover.
 *   - a partial failure is not healthy. The site answered, but from a subset of
 *     its retrieval, and calling that healthy is the same mistake as calling an
 *     empty result a failure — in the other direction.
 */
export function assessRetrieval(input: {
  vectorRan: boolean;
  vectorFailed: boolean;
  bm25Ran: boolean;
  bm25Failed: boolean;
  resultCount: number;
}): RetrievalHealth {
  const ran: ("vector" | "bm25")[] = [];
  const failed: ("vector" | "bm25")[] = [];
  if (input.vectorRan) ran.push("vector");
  if (input.bm25Ran) ran.push("bm25");
  if (input.vectorFailed) failed.push("vector");
  if (input.bm25Failed) failed.push("bm25");

  const healthy = ran.length > 0 && failed.length === 0;
  return { ran, failed, healthy, empty: healthy && input.resultCount === 0 };
}

// Vector retrieval using Cloudflare Vectorize + D1 + KV cache
export async function retrieveVector(
  question: string,
  env: Env,
  config: typeof import("./chat.config").CHAT_CONFIG,
  topK = config.topK,
): Promise<RetrievalResult[]> {
  // corpusVersion is part of the key: bumping CHAT_CONFIG.corpusVersion retires
  // every previously cached result without needing a KV scan or delete.
  const cacheKey = `rag:v${config.corpusVersion}:${hashString(question.toLowerCase().trim())}`;

  // 1. Check semantic cache (KV)
  //
  // `fromCache: true` records where the result came from; `source` keeps the
  // provenance of the query that produced it, which is always vector for this
  // function. The normalisation matters: entries written before `fromCache`
  // existed have `source: "cache"` on disk for up to `cacheTTL`, and reading
  // one verbatim would put a value back into `source` that is no longer a
  // member of the union — silently reintroducing exactly the bug this removes.
  // A cache read failure is not a retrieval failure. The cache is an
  // optimisation; if it is unavailable the correct response is to query the
  // index directly, not to report the index as broken. Letting this throw would
  // mark vector retrieval as failed and flip the availability dot.
  let cached: (RetrievalResult & { source?: string })[] | null = null;
  try {
    const hit: unknown = await env.CACHE.get(cacheKey, "json");
    cached = Array.isArray(hit) ? (hit as (RetrievalResult & { source?: string })[]) : null;
  } catch (e) {
    console.warn("[retrieval] cache read failed, querying the index directly:", e);
  }
  if (cached) {
    return cached.map((r) => ({
      ...r,
      source: "vector" as const,
      fromCache: true,
    }));
  }

  // 2. Generate query embedding via Workers AI
  const embeddingResponse = (await env.AI.run(config.embeddingModel, {
    text: [question],
  })) as { data: number[][] };
  const queryVector = embeddingResponse.data[0];
  if (!queryVector || queryVector.length !== config.dimensions) {
    console.warn(
      `Embedding model returned ${queryVector?.length ?? 0} dimensions, expected ${config.dimensions}.`,
    );
    return [];
  }

  // 3. Vectorize similarity search
  const vectorizeResults = await env.VECTORIZE.query(queryVector, {
    topK: topK * 2, // fetch more for reranking
    returnMetadata: true,
  });

  if (!vectorizeResults.matches || vectorizeResults.matches.length === 0) {
    return [];
  }
  // Vectorize returns chunk ids shaped "<parentId>#<index>".
  const parentId = (chunkId: string) => chunkId.split("#")[0] ?? chunkId;

  // 4. Fetch the matching passages from D1.
  //
  // Vectorize stores a vector per chunk, so the search finds the right passage
  // and then used to throw it away — the parent document's entire text went to
  // the model instead. Every unrelated section consumed prompt space, and the
  // model had to work out which part of a wall of text was actually relevant.
  // Chunking improved ranking and did nothing for context precision.
  //
  // Multiple chunks from the same document are merged into one result so a
  // document cannot crowd out its neighbours by appearing once per passage.
  const { results: passageRows } = await env.DB.prepare(
    `SELECT c.id AS chunkId, c.doc_id AS docId, c.content AS passage, d.category, d.title
       FROM chunks c JOIN documents d ON d.id = c.doc_id
      WHERE c.id IN (${vectorizeResults.matches.map(() => "?").join(",")})`,
  )
    .bind(...vectorizeResults.matches.map((m) => m.id))
    .all<{
      chunkId: string;
      docId: string;
      passage: string;
      category: string | null;
      title: string;
    }>();

  // 5. Attach the best-scoring chunk's score to its document, and keep every
  //    passage that matched above the cut-off.
  const byDoc = new Map<string, { category: string | null; title: string; passages: string[] }>();
  for (const row of passageRows) {
    const entry = byDoc.get(row.docId) ?? {
      category: row.category,
      title: row.title,
      passages: [],
    };
    entry.passages.push(row.passage);
    byDoc.set(row.docId, entry);
  }

  const best = new Map<string, number>();
  for (const match of vectorizeResults.matches) {
    const pid = parentId(match.id);
    if (match.score > (best.get(pid) ?? -1)) best.set(pid, match.score);
  }

  // Documents with no stored passages still have to answer. A partially
  // migrated index — passages not yet written for a document — would otherwise
  // silently drop that document from the vector path entirely, which is how a
  // "hybrid" retrieval ends up running on one method.
  const missingPassages = [...best.keys()].filter((pid) => !byDoc.has(pid));
  if (missingPassages.length > 0) {
    console.warn(
      `[retrieval] ${missingPassages.length} vector match(es) have no stored passage — ` +
        `falling back to full document text. Run the ingest to store passages.`,
    );
    const { results: fallbackDocs } = await env.DB.prepare(
      `SELECT id, category, title, content FROM documents WHERE id IN (${missingPassages
        .map(() => "?")
        .join(",")})`,
    )
      .bind(...missingPassages)
      .all<{ id: string; category: string | null; title: string; content: string }>();
    for (const doc of fallbackDocs) {
      byDoc.set(doc.id, {
        category: doc.category,
        title: doc.title,
        passages: [doc.content],
      });
    }
  }

  const results: RetrievalResult[] = [...best.entries()]
    .map(([pid, score]): RetrievalResult | null => {
      const entry = byDoc.get(pid);
      if (!entry) return null;
      return {
        id: pid,
        anchor: anchorFor(entry.category),
        title: entry.title,
        content: entry.passages.join("\n\n"),
        score,
        source: "vector",
      };
    })
    .filter((r): r is RetrievalResult => r !== null);

  results.sort((a, b) => b.score - a.score);
  const finalResults = results.slice(0, config.rerankTopK);

  // 7. Cache results
  await env.CACHE.put(cacheKey, JSON.stringify(finalResults), {
    expirationTtl: config.cacheTTL,
  });

  return finalResults;
}

// Hybrid retrieval: combines static + vector + BM25 (D1 FTS5)
/**
 * Turn a natural-language question into a valid FTS5 MATCH expression.
 *
 * FTS5 parses its argument as a query grammar, not as text: a trailing "?" is
 * a syntax error, and unquoted tokens are combined with implicit AND, which is
 * far too strict for a question like "what did he do at Oracle". Quoting each
 * term and joining with OR gives a query that behaves the way a reader expects.
 *
 * Returns null when the question has no usable terms, so the caller can skip
 * keyword retrieval instead of issuing a query that will throw.
 */
function toFtsQuery(question: string): string | null {
  const terms = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 12);

  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"`).join(" OR ");
}

/** Reciprocal Rank Fusion over the static, vector and keyword rankings. */
export async function retrieveHybrid(
  question: string,
  env: Env,
  config: typeof import("./chat.config").CHAT_CONFIG,
): Promise<RetrievalOutcome> {
  // Whether each live method ran, and whether it worked. Recorded by the
  // promises below rather than derived from the result count afterwards,
  // because "matched nothing" and "did not run" produce the same array.
  let vectorRan = false;
  let vectorFailed = false;
  let bm25Ran = false;
  let bm25Failed = false;

  // Static results (fast, deterministic)
  const staticResults = retrieveStatic(question, config.topK);

  // Vector results (semantic)
  const vectorPromise = retrieveVector(question, env, config)
    .then((results) => {
      vectorRan = true;
      return results;
    })
    .catch((e) => {
      vectorFailed = true;
      console.warn("Vector retrieval failed, using static only:", e);
      return [] as RetrievalResult[];
    });

  // BM25 results from D1 FTS5.
  //
  // Two things matter here and both were wrong originally:
  //  1. FTS5 MATCH takes a *query*, not a sentence. Passing the raw question
  //     makes it a syntax error (the "?" especially), the promise rejects, and
  //     the catch below quietly returns zero results — so keyword search never
  //     ran at all. Build a proper OR-of-terms query instead.
  //  2. SQLite's bm25() returns NEGATIVE numbers, lower = better match. The
  //     old 1/(1+score) transform divided by ~zero and produced Infinity and
  //     negative similarities. Negate it so higher is better, then normalise.
  const bm25Promise = (async (): Promise<RetrievalResult[]> => {
    // A question with no term long enough to index is not a failure. It is a
    // successful search that had nothing to search for, and counting it as an
    // error is how "are you single" ended up looking like a broken index.
    const ftsQuery = toFtsQuery(question);
    if (!ftsQuery) {
      bm25Ran = true;
      return [];
    }
    try {
      const { results } = await env.DB.prepare(
        `SELECT d.id, d.source, d.category, d.title, d.content,
                -bm25(documents_fts) AS score
         FROM documents_fts
         JOIN documents d ON d.id = documents_fts.id
         WHERE documents_fts MATCH ?
         ORDER BY score DESC LIMIT ?`,
      )
        .bind(ftsQuery, config.topK)
        .all();

      type Bm25Row = {
        id: string;
        source: string;
        category: string | null;
        title: string;
        content: string;
        score: number;
      };

      bm25Ran = true;
      const rows = (results as unknown as Bm25Row[]) || [];
      const best = rows[0]?.score ?? 0;

      return rows.map((r) => ({
        id: r.id,
        anchor: anchorFor(r.category),
        title: r.title,
        content: r.content,
        // Relative to the top hit, so RRF fusion sees a comparable scale.
        score: best > 0 ? r.score / best : 0,
        source: "bm25" as const,
      }));
    } catch (e) {
      bm25Failed = true;
      console.warn("BM25 retrieval failed:", e);
      return [];
    }
  })();

  // Vector and BM25 are independent: one embeds and queries Vectorize, the other
  // runs an FTS5 MATCH against D1. Awaiting them in sequence made p95 latency
  // the SUM of both round trips rather than the slower one, and this sits
  // directly in front of the first token the visitor sees. Neither depends on
  // the other's result, so there is nothing to sequence.
  const [vectorResults, bm25Results] = await Promise.all([vectorPromise, bm25Promise]);

  // Reciprocal Rank Fusion (RRF) to merge all three rankings.
  //
  // Each source contributes weight / (K + rank). Scores ACCUMULATE across
  // sources — that accumulation is the entire point. A document that vector,
  // BM25 and static search all rank highly is corroborated by three
  // independent methods and must outrank a document only one of them found.
  //
  // This previously kept the single largest contribution instead of the sum,
  // which made a document that ranked in all three lists score exactly the
  // same as one found by a single list. There was no consensus boost at all,
  // and the code comment claimed there was. Retrieval quality was never worse
  // than single-method, but it was also never better than the best method.
  const sources: [RetrievalResult[], number][] = [
    [staticResults, 1.0],
    [vectorResults, 1.5],
    [bm25Results, 1.0],
  ];
  const K = 60;
  const rrfScores = new Map<string, { result: RetrievalResult; score: number }>();

  for (const [sourceResults, weight] of sources) {
    sourceResults.forEach((r, rank) => {
      const contribution = weight / (K + rank + 1);
      const existing = rrfScores.get(r.id);
      if (existing) {
        existing.score += contribution;
      } else {
        rrfScores.set(r.id, { result: r, score: contribution });
      }
    });
  }

  const fused = Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, config.rerankTopK)
    .map((v) => v.result);

  const results = fused.length > 0 ? fused : staticResults;

  return {
    results,
    health: assessRetrieval({
      vectorRan,
      vectorFailed,
      bm25Ran,
      bm25Failed,
      resultCount: results.length,
    }),
  };
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
