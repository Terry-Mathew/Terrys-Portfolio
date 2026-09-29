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

/** Anchors the site's source links to. Unknown files fall back to "knowledge". */
const CATEGORY: Record<string, string> = {
  "bio.md": "about",
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
  "off-the-clock.md": "off-the-clock",
  "approach.md": "approach",
  "speaking.md": "speaking",
  "resume.md": "resume",
  "how-this-works.md": "how-this-works",
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

export type IngestResult = {
  ok: boolean;
  indexed: number;
  unchanged: string[];
  dimensions: number;
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
  const pending: { id: string; hash: string }[] = [];

  for (const source of SOURCES) {
    const hash = await sha256(source.body);
    const existing = await bindings.DB.prepare("SELECT hash FROM documents WHERE id = ?")
      .bind(source.id)
      .first<{ hash: string }>();

    if (!force && existing?.hash === hash) {
      unchanged.push(source.id);
      continue;
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

    pending.push({ id: source.id, hash });
  }

  if (vectors.length > 0 && dimensions !== CHAT_CONFIG.dimensions) {
    return {
      ok: false,
      indexed: 0,
      unchanged,
      dimensions,
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

  return {
    ok: true,
    indexed: vectors.length,
    unchanged,
    dimensions,
    message: vectors.length
      ? `Indexed ${vectors.length} chunk(s) at ${dimensions} dimensions.`
      : `Nothing changed. ${unchanged.length} document(s) already current.`,
  };
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
