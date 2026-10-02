import { CHAT_CONFIG } from "@/server/chat.config";
import type { CloudflareEnvShape } from "@/server/env";

export type KnowledgeSource = { id: string; category: string; title: string; body: string };
export type RagEnv = Required<Pick<CloudflareEnvShape, "VECTORIZE" | "DB" | "CACHE" | "AI">>;

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
export async function syncKnowledgeIndex(
  bindings: RagEnv,
  sources: KnowledgeSource[],
  force = false,
): Promise<IngestResult> {
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
  const pending: { source: KnowledgeSource; hash: string; chunks: string[] }[] = [];

  for (const source of sources) {
    const hash = await sha256(fingerprint(source));
    const chunks = chunk(source.body, CHAT_CONFIG.chunkSize, CHAT_CONFIG.chunkOverlap);
    const existing = await bindings.DB.prepare("SELECT hash FROM documents WHERE id = ?")
      .bind(source.id)
      .first<{ hash: string }>();

    if (!force && existing?.hash === hash) {
      // A document indexed before passages were stored has vectors but no
      // retrievable text. Content is unchanged, so the hash says "skip" — but
      // retrieval would have nothing to return for it. Treat missing passages
      // as needing the work, so one run repairs every pre-migration document.
      const { results: passageRows } = await bindings.DB.prepare(
        "SELECT idx, content FROM chunks WHERE doc_id = ? ORDER BY idx",
      )
        .bind(source.id)
        .all<{ idx: number; content: string }>();
      const fts = await bindings.DB.prepare("SELECT content FROM documents_fts WHERE id = ?")
        .bind(source.id)
        .first<{ content: string }>();
      if (
        passageRows.length === chunks.length &&
        passageRows.every((row, i) => row.idx === i && row.content === chunks[i]) &&
        fts?.content === source.body
      ) {
        unchanged.push(source.id);
        continue;
      }
      console.warn(`[ingest] ${source.id} has incomplete passages or keyword text — repairing.`);
    }

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

    pending.push({ source, hash, chunks });
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

  // D1 batch is a transaction. The document hash, keyword text, and passages
  // commit together. A failed statement rolls all of them back, so the next
  // ingest sees the old hash and retries after a partial Worker failure.
  let removedTailVectors = 0;
  for (const { source, hash, chunks } of pending) {
    const id = source.id;
    const { results: oldTail } = await bindings.DB.prepare(
      "SELECT id FROM chunks WHERE doc_id = ? AND idx >= ?",
    )
      .bind(id, chunks.length)
      .all<{ id: string }>();
    // Delete stale vectors while D1 still records their IDs. If deletion fails,
    // the old hash remains available for a retry.
    if (oldTail.length > 0) {
      await bindings.VECTORIZE.deleteByIds(oldTail.map((row) => row.id));
      removedTailVectors += oldTail.length;
    }
    const now = Date.now();
    await bindings.DB.batch([
      bindings.DB.prepare(
        `INSERT INTO documents (id, source, category, title, content, hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         category = excluded.category,
         title = excluded.title,
         content = excluded.content,
         hash = excluded.hash,
         updated_at = excluded.updated_at`,
      ).bind(id, id, source.category, source.title, source.body, hash, now, now),
      bindings.DB.prepare("DELETE FROM documents_fts WHERE id = ?").bind(id),
      bindings.DB.prepare("INSERT INTO documents_fts (content, id) VALUES (?, ?)").bind(
        source.body,
        id,
      ),
      bindings.DB.prepare("DELETE FROM chunks WHERE doc_id = ?").bind(id),
      ...chunks.map((text, i) =>
        bindings.DB.prepare(
          "INSERT INTO chunks (id, doc_id, idx, content, updated_at) VALUES (?, ?, ?, ?, ?)",
        ).bind(`${id}#${i}`, id, i, text, now),
      ),
    ]);
  }

  const reconciliation = await reconcile(bindings, sources);
  reconciliation.removedVectors += removedTailVectors;

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
  sources: KnowledgeSource[],
): Promise<{ removedDocs: number; removedVectors: number }> {
  const expectedDocs = new Set(sources.map((s) => s.id));
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
    if (ids.length) await bindings.VECTORIZE.deleteByIds(ids);
    // The keyword index is a separate table with its own copy of the text.
    // Leaving a row here is how a deleted project kept answering questions.
    await bindings.DB.batch([
      bindings.DB.prepare("DELETE FROM documents_fts WHERE id = ?").bind(row.id),
      bindings.DB.prepare("DELETE FROM chunks WHERE doc_id = ?").bind(row.id),
      bindings.DB.prepare("DELETE FROM documents WHERE id = ?").bind(row.id),
    ]);
    removedDocs++;
    removedVectors += ids.length;
  }

  if (removedDocs || removedVectors) {
    console.warn(
      `[ingest] reconciled: removed ${removedDocs} stale document(s), ${removedVectors} stale vector(s)`,
    );
  }
  return { removedDocs, removedVectors };
}
