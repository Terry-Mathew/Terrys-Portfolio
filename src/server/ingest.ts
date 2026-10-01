// Knowledge ingestion — runs inside the Worker, so it uses the same Vectorize,
// D1 and Workers AI bindings the chat handler already has.
//
// Deliberately NOT a Queue + Durable Object. The corpus is a handful of Markdown
// files bundled with the build, so a durable pipeline would add deploy-time
// fragility (Nitro's cloudflare-module preset cannot export DO classes from the
// module entrypoint) for no operational gain. Content changes are rare and
// always human-triggered.
//
// After deploying a build that changed src/content/knowledge/*.md:
//   curl -X POST https://<your-host>/api/ingest -H "x-ingest-key: <INGEST_KEY>"
//
// Requires the INGEST_KEY secret.

// To add content: drop a new .md file in src/content/knowledge/ and redeploy.
// No code change needed — see SOURCES below.

import { CHAT_CONFIG } from "@/server/chat.config";
import type { CloudflareEnvShape } from "@/server/env";

/** Bindings ingestion actually requires. */
const REQUIRED = ["VECTORIZE", "DB", "CACHE", "AI"] as const;

type RagEnv = Required<Pick<CloudflareEnvShape, (typeof REQUIRED)[number]>>;

function requireBindings(env: CloudflareEnvShape): RagEnv | undefined {
  return REQUIRED.every((key) => Boolean(env[key])) ? (env as RagEnv) : undefined;
}

// Every .md in the knowledge folder is ingested automatically. To add content,
// create a file there — do not edit this list.
//
// Naming:
//   bio.md, off-the-clock.md, skills.md ...  → ingested
//   _draft.md  (leading underscore)          → skipped, for work in progress
//   README.md, RAG-ARCHITECTURE.md           → skipped, internal docs
const rawModules = import.meta.glob("../content/knowledge/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const SKIP = new Set(["README.md", "RAG-ARCHITECTURE.md"]);

/**
 * Where the chatbot's source links point.
 *
 * Each value is either a bare section id on the home page, or a path to a real
 * route. Both are resolved by {@link anchorFor} in knowledge.ts, which prefixes
 * a bare id with `#` and leaves a path alone.
 *
 * Three of these were wrong, and all of them shipped:
 *  - "off-the-clock" — no element on the site carries that id. The section is
 *    `id="beyond-work"` (OffTheClock.tsx), so every citation to Terry's
 *    hobbies was a link to nowhere.
 *  - "how-this-works" — no route and no element with that id at all. The
 *    document explaining the chatbot pointed at nothing. It is now the Digital
 *    Twin case study, which is the real page that describes it.
 *  - "resume" — no such section either. The resume is a PDF, not a section, so
 *    it links to the file itself. That is the same target the nav and the
 *    contact section already use, so a citation agrees with the rest of the page.
 *
 * "approach" and "speaking" used to be listed here too, and both were wrong:
 * neither `approach.md` nor `speaking.md` is in the corpus, and no element
 * carries either id. They are removed rather than pointed somewhere plausible —
 * an inert mapping for a file that does not exist is dead code that will
 * quietly mislabel the day someone adds one. scripts/pipeline-test.mjs checks
 * every remaining entry against the ids and routes that actually exist.
 *
 * Anything unknown falls back to "knowledge", which has no anchor either. That
 * is deliberate: a dead `#knowledge` link is visible and fixable, whereas
 * guessing an anchor that does not exist hides the mistake.
 */
const CATEGORY: Record<string, string> = {
  "bio.md": "about",
  // The canonical facts layer. Anchored to #about because it is where a
  // visitor asking "who is Terry" should end up, and because it restates the
  // biography rather than replacing it — two documents answering the same
  // question is the duplication that `experiments.md` was trimmed to avoid.
  // Without an entry here this would fall back to `#knowledge`, which exists
  // nowhere, and every citation drawn from the facts layer would be a dead
  // link — which is exactly what happened twice before the anchor test.
  "facts.md": "about",
  "experience.md": "experience",
  // "work" is chatbot context only — the Selected Work section was removed, so
  // anchoring to #selected-work would emit a dead source link.
  "work.md": "experience",
  // The home-page project section is id="experiments"; "projects" is a real
  // route but there is no #projects anchor to link to. experiments.md is the
  // single project document — a second one only creates two answers to the
  // same question.
  "experiments.md": "experiments",
  "skills.md": "capabilities",
  "contact.md": "contact",
  "off-the-clock.md": "beyond-work",
  "resume.md": "/Terry-Mathew-CV.pdf",
  "how-this-works.md": "/projects/digital-twin",
};

const humanize = (name: string) =>
  name
    .replace(/\.md$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const SOURCES = Object.entries(rawModules)
  .map(([path, body]) => {
    const file = path.split("/").pop() ?? path;
    return {
      file,
      id: file.replace(/\.md$/, ""),
      category: CATEGORY[file] ?? "knowledge",
      title: /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? humanize(file),
      body,
    };
  })
  .filter((s) => !SKIP.has(s.file) && !s.file.startsWith("_") && s.body.trim().length > 0)
  .sort((a, b) => a.id.localeCompare(b.id));

/** Split on line boundaries, hard-wrap to `size`, overlap consecutive chunks. */
function chunk(text: string, size: number, overlap: number): string[] {
  const clean = text
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean)
    .join("\n");

  if (clean.length <= size) return [clean];

  const out: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let start = 0; start < clean.length; start += step) {
    const slice = clean.slice(start, start + size);
    if (slice.trim()) out.push(slice.trim());
    if (start + size >= clean.length) break;
  }
  return out;
}

async function embed(env: RagEnv, texts: string[]): Promise<number[][]> {
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += 10) {
    const res = (await env.AI.run(CHAT_CONFIG.embeddingModel, {
      text: texts.slice(i, i + 10),
    })) as { data: number[][] };
    all.push(...res.data);
  }
  return all;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * What the stored hash actually covers: the text, plus where it links to.
 *
 * Hashing the body alone meant a category-only change could never land. The
 * document is skipped when its body hash matches, and `documents.category` is
 * only rewritten for documents that were NOT skipped — so editing `CATEGORY`
 * changed the mapping in the source and changed nothing in the index. The
 * chatbot carried on emitting the dead anchor until someone noticed the dead
 * link by hand.
 *
 * The deploy workflow calls ingest without `?force=1`, so this is the only
 * mechanism that can carry a category change to production. The NUL separator
 * cannot occur in a filename, so `a\u0000bc` and `ab\u0000c` cannot collide.
 *
 * Cost: changing this invalidates every document once and forces one full
 * re-embed. That is a one-time cost and it is the correct trade — the hash has
 * to cover everything that is written to the row.
 */
function fingerprint(source: { category: string; body: string }): string {
  return `${source.category}\u0000${source.body}`;
}

export type IngestResult = {
  ok: boolean;
  indexed: number;
  unchanged: string[];
  dimensions: number;
  /** Documents and vectors deleted because no source file accounts for them. */
  removedDocs: number;
  removedVectors: number;
  message: string;
};

/**
 * @param force Re-embed everything, ignoring stored content hashes. Needed when
 *   the vector index and D1 have drifted apart — the hashes say "current" while
 *   the vectors are missing.
 */
export async function ingestKnowledge(
  env: CloudflareEnvShape,
  force = false,
): Promise<IngestResult> {
  const bindings = requireBindings(env);
  if (!bindings) {
    return {
      ok: false,
      indexed: 0,
      unchanged: [],
      dimensions: 0,
      removedDocs: 0,
      removedVectors: 0,
      message: `Missing Cloudflare binding(s): ${REQUIRED.filter((k) => !env[k]).join(", ")}.`,
    };
  }

  const unchanged: string[] = [];
  const vectors: {
    id: string;
    values: number[];
    metadata: Record<string, string | number>;
  }[] = [];
  let dimensions = 0;

  // Order matters: embeddings are generated, then pushed to Vectorize, and only
  // then are the content hashes written to D1.
  //
  // Writing the hash inside the loop (as this used to) records a document as
  // "current" before its vectors exist. If the Worker is then killed before the
  // Vectorize upsert — or the upsert fails without throwing — the next run sees
  // a matching hash, skips the document, and reports success while the vector
  // index stays empty. D1 and Vectorize would permanently disagree, and
  // retrieval would silently degrade to keyword lookup forever.
  const pending: { id: string; hash: string; chunkCount: number }[] = [];

  for (const source of SOURCES) {
    const hash = await sha256(fingerprint(source));
    const existing = await bindings.DB.prepare("SELECT hash FROM documents WHERE id = ?")
      .bind(source.id)
      .first<{ hash: string }>();

    if (!force && existing?.hash === hash) {
      // A document indexed before passages were stored has vectors but no
      // retrievable text. Content is unchanged, so the hash says "skip" — but
      // retrieval would have nothing to return for it. Treat missing passages
      // as needing the work, so one run repairs every pre-migration document.
      const { results: passageRows } = await bindings.DB.prepare(
        "SELECT id FROM chunks WHERE doc_id = ?",
      )
        .bind(source.id)
        .all<{ id: string }>();
      if (passageRows.length > 0) {
        unchanged.push(source.id);
        continue;
      }
      console.warn(`[ingest] ${source.id} has no stored passages — re-embedding to create them.`);
    }

    const chunks = chunk(source.body, CHAT_CONFIG.chunkSize, CHAT_CONFIG.chunkOverlap);
    const embedded = await embed(bindings, chunks);
    dimensions ||= embedded[0]?.length ?? 0;

    chunks.forEach((_text, i) => {
      vectors.push({
        id: `${source.id}#${i}`,
        values: embedded[i]!,
        metadata: {
          source: source.id,
          category: source.category,
          title: source.title,
          chunkIndex: i,
        },
      });
    });

    pending.push({ id: source.id, hash, chunkCount: chunks.length });
  }

  if (vectors.length > 0 && dimensions !== CHAT_CONFIG.dimensions) {
    return {
      ok: false,
      indexed: 0,
      unchanged,
      dimensions,
      removedDocs: 0,
      removedVectors: 0,
      message:
        `Model returned ${dimensions} dimensions but CHAT_CONFIG.dimensions is ` +
        `${CHAT_CONFIG.dimensions}. Fix the config and recreate the Vectorize index first.`,
    };
  }

  // Vectors first. If this throws, no hash is written, so the next run retries.
  if (vectors.length > 0) {
    try {
      await bindings.VECTORIZE.upsert(vectors);
    } catch (error) {
      console.error("Vectorize upsert failed:", error);
      return {
        ok: false,
        indexed: 0,
        unchanged,
        dimensions,
        removedDocs: 0,
        removedVectors: 0,
        message: `Vectorize upsert failed: ${
          error instanceof Error ? error.message : "unknown error"
        }. No hashes were written, so the next run will retry.`,
      };
    }
  }

  // Hashes last: by this point the vectors are durably in the index.
  for (const { id, hash } of pending) {
    const source = SOURCES.find((s) => s.id === id)!;
    await bindings.DB.prepare(
      `INSERT INTO documents (id, source, category, title, content, hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         category = excluded.category,
         title = excluded.title,
         content = excluded.content,
         hash = excluded.hash,
         updated_at = excluded.updated_at`,
    )
      .bind(id, id, source.category, source.title, source.body, hash, Date.now(), Date.now())
      .run();
  }

  // Keyword index.
  //
  // documents_fts is queried on every retrieval at knowledge.ts, and nothing in
  // this file used to write to it. The table held a frozen snapshot from an
  // early ingest: rows for a file that had since been deleted, no row for a
  // file added since, and document text up to thirteen times out of date. BM25
  // was answering confidently from months-old content and nothing reported it,
  // because retrievalMode was set from the call succeeding rather than from
  // anything contributing.
  //
  // Written alongside `documents` in the same loop so the two cannot drift.
  // FTS5 has no UPSERT, so the row is replaced rather than updated.
  for (const { id } of pending) {
    const source = SOURCES.find((s) => s.id === id)!;
    await bindings.DB.prepare("DELETE FROM documents_fts WHERE id = ?").bind(id).run();
    await bindings.DB.prepare("INSERT INTO documents_fts (content, id) VALUES (?, ?)")
      .bind(source.body, id)
      .run();
  }

  // Passage text, so retrieval can return the chunk that matched instead of the
  // whole document it came from.
  for (const { id } of pending) {
    const source = SOURCES.find((s) => s.id === id)!;
    const chunks = chunk(source.body, CHAT_CONFIG.chunkSize, CHAT_CONFIG.chunkOverlap);
    await bindings.DB.prepare("DELETE FROM chunks WHERE doc_id = ?").bind(id).run();
    for (const [i, text] of chunks.entries()) {
      await bindings.DB.prepare(
        "INSERT INTO chunks (id, doc_id, idx, content, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(`${id}#${i}`, id, i, text, Date.now())
        .run();
    }
  }

  const reconciliation = await reconcile(bindings, pending);

  return {
    ok: true,
    indexed: vectors.length,
    unchanged,
    dimensions,
    ...reconciliation,
    message: vectors.length
      ? `Indexed ${vectors.length} chunk(s) at ${dimensions} dimensions.` +
        (reconciliation.removedDocs || reconciliation.removedVectors
          ? ` Removed ${reconciliation.removedDocs} stale document(s) and ${reconciliation.removedVectors} stale vector(s).`
          : "")
      : `Nothing changed. ${unchanged.length} document(s) already current.`,
  };
}

/**
 * Delete everything the current source files no longer account for.
 *
 * Upsert alone only ever adds or replaces. Two things survive it forever:
 *
 *  - a document whose Markdown file was deleted. Its row keeps its vectors, so
 *    the chatbot keeps answering from content that is no longer on the site.
 *    This is how a project stayed retrievable long after it was pulled from
 *    the page.
 *  - a document that shrank. If a file had five chunks and now has three,
 *    `id#3` and `id#4` remain in the index and still match searches, pointing
 *    at passages the source no longer contains.
 *
 * Driven from the `documents` and `chunks` tables rather than by enumerating
 * the vector index, which has no list API. Both stale cases name their own
 * vector ids, so nothing has to be discovered by search.
 */
async function reconcile(
  bindings: RagEnv,
  pending: { id: string; hash: string; chunkCount: number }[],
): Promise<{ removedDocs: number; removedVectors: number }> {
  const expectedDocs = new Set(SOURCES.map((s) => s.id));
  const refreshed = new Map(pending.map((p) => [p.id, p.chunkCount]));
  let removedDocs = 0;
  let removedVectors = 0;

  // 1. Documents whose file no longer exists.
  const { results: allDocs } = await bindings.DB.prepare("SELECT id FROM documents").all<{
    id: string;
  }>();
  for (const row of allDocs) {
    if (expectedDocs.has(row.id)) continue;
    const { results: orphanChunks } = await bindings.DB.prepare(
      "SELECT id FROM chunks WHERE doc_id = ?",
    )
      .bind(row.id)
      .all<{ id: string }>();
    const ids = orphanChunks.map((c) => c.id);
    if (ids.length) {
      try {
        await bindings.VECTORIZE.deleteByIds(ids);
      } catch (e) {
        console.warn(`[ingest] vector delete failed for ${row.id}:`, e);
      }
    }
    await bindings.DB.prepare("DELETE FROM chunks WHERE doc_id = ?").bind(row.id).run();
    await bindings.DB.prepare("DELETE FROM documents WHERE id = ?").bind(row.id).run();
    // The keyword index is a separate table with its own copy of the text.
    // Leaving a row here is how a deleted project kept answering questions.
    await bindings.DB.prepare("DELETE FROM documents_fts WHERE id = ?").bind(row.id).run();
    removedDocs++;
    removedVectors += ids.length;
  }

  // 2. Passages past the end of a document that shrank this run.
  for (const [docId, count] of refreshed) {
    const { results: tail } = await bindings.DB.prepare(
      "SELECT id FROM chunks WHERE doc_id = ? AND idx >= ?",
    )
      .bind(docId, count)
      .all<{ id: string }>();
    if (tail.length === 0) continue;
    try {
      await bindings.VECTORIZE.deleteByIds(tail.map((t) => t.id));
    } catch (e) {
      console.warn(`[ingest] vector delete failed for ${docId}:`, e);
    }
    await bindings.DB.prepare("DELETE FROM chunks WHERE doc_id = ? AND idx >= ?")
      .bind(docId, count)
      .run();
    removedVectors += tail.length;
  }

  if (removedDocs || removedVectors) {
    console.warn(
      `[ingest] reconciled: removed ${removedDocs} stale document(s), ${removedVectors} stale vector(s)`,
    );
  }
  return { removedDocs, removedVectors };
}

export type VerifyResult = {
  ok: boolean;
  query: string;
  dimensions: number;
  matchCount: number;
  matches: { id: string; score: number; category: string | null }[];
  generation: { workersAi: string; anthropic: string };
  message: string;
};

const PROBE = "Reply with the single word: ok";

async function checkGeneration(
  env: CloudflareEnvShape,
  bindings: RagEnv,
): Promise<VerifyResult["generation"]> {
  // Workers AI fallback.
  let workersAi: string;
  try {
    const res = (await bindings.AI.run(CHAT_CONFIG.generationModel, {
      messages: [{ role: "user", content: PROBE }],
      max_tokens: 16,
    })) as { response?: string };
    workersAi = res.response ? "ok" : "empty response";
  } catch (error) {
    workersAi = `FAILED: ${error instanceof Error ? error.message : "unknown"}`;
  }

  // Anthropic is opt-in and off by default, so report the flag rather than
  // silently probing a path the site does not use.
  let anthropic: string;
  if (!CHAT_CONFIG.useAnthropic) {
    anthropic = "disabled (useAnthropic: false)";
  } else if (!env.ANTHROPIC_API_KEY) {
    anthropic = "enabled but no key set";
  } else {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CHAT_CONFIG.anthropicModel,
          max_tokens: 16,
          messages: [{ role: "user", content: PROBE }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      anthropic = res.ok ? "ok" : `HTTP ${res.status} ${(await res.text()).slice(0, 160)}`;
    } catch (error) {
      anthropic = `FAILED: ${error instanceof Error ? error.message : "unknown"}`;
    }
  }

  return { workersAi, anthropic };
}

/**
 * Proves the semantic path works end to end: embeds a probe question, queries
 * Vectorize, and reports what came back.
 *
 * This exists because the two stores can disagree. A run that writes D1 and
 * then dies before the Vectorize upsert leaves documents that look "current" on
 * the next run and get skipped forever, while the vector index stays empty. The
 * chat handler then silently serves static keyword search and nothing looks
 * broken. Run this after any ingestion.
 *
 * The default probe deliberately shares no vocabulary with the source text, so
 * a hit proves meaning-based retrieval rather than keyword matching.
 */
export async function verifyRetrieval(
  env: CloudflareEnvShape,
  query = "what did he do before joining the company",
): Promise<VerifyResult> {
  const bindings = requireBindings(env);
  if (!bindings) {
    return {
      ok: false,
      query,
      dimensions: 0,
      matchCount: 0,
      matches: [],
      generation: { workersAi: "unavailable", anthropic: "unavailable" },
      message: `Missing binding(s): ${REQUIRED.filter((k) => !env[k]).join(", ")}.`,
    };
  }

  const res = (await bindings.AI.run(CHAT_CONFIG.embeddingModel, { text: [query] })) as {
    data: number[][];
  };
  const vector = res.data[0];
  const dimensions = vector?.length ?? 0;

  if (!vector || dimensions !== CHAT_CONFIG.dimensions) {
    return {
      ok: false,
      query,
      dimensions,
      matchCount: 0,
      matches: [],
      generation: { workersAi: "untested", anthropic: "untested" },
      message: `Embedding returned ${dimensions} dimensions, expected ${CHAT_CONFIG.dimensions}.`,
    };
  }

  const hits = await bindings.VECTORIZE.query(vector, { topK: 3, returnMetadata: true });
  const matches = (hits.matches ?? []).map((m) => ({
    id: m.id,
    score: Number(m.score?.toFixed(4) ?? 0),
    category: (m.metadata as { category?: string } | undefined)?.category ?? null,
  }));

  const generation = await checkGeneration(env, bindings);

  return {
    ok: matches.length > 0,
    query,
    dimensions,
    matchCount: matches.length,
    matches,
    generation,
    message: matches.length
      ? `Vectorize returned ${matches.length} match(es). Best: ${matches[0]?.id} (${matches[0]?.score}).`
      : "Vectorize is empty — run the ingestion step.",
  };
}
