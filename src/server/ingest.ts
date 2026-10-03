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
import { parseFrontmatter } from "@/server/frontmatter";
import { syncKnowledgeIndex, type IngestResult, type RagEnv } from "@/server/knowledge-index";

/** Bindings ingestion actually requires. */
const REQUIRED = ["VECTORIZE", "DB", "CACHE", "AI"] as const;

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
 *  - "resume" — resume details stay in chatbot knowledge. Citations point to
 *    the public Experience section because the downloadable PDF is removed.
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
  "resume.md": "experience",
  "how-this-works.md": "/projects/digital-twin",
};

const humanize = (name: string) =>
  name
    .replace(/\.md$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const SOURCES = Object.entries(rawModules)
  .map(([path, raw]) => {
    const file = path.split("/").pop() ?? path;
    // Frontmatter is parsed here and then deliberately not carried forward.
    // `body` is what gets hashed, chunked, embedded, and written to D1 and the
    // FTS index, so keeping the metadata out of it means a title edit costs
    // nothing and the metadata never pollutes keyword or vector search. The
    // source file is untouched — this only changes what is read out of it.
    const { frontmatter, body } = parseFrontmatter(raw);
    return {
      file,
      id: file.replace(/\.md$/, ""),
      category: CATEGORY[file] ?? "knowledge",
      // The frontmatter title wins over the first heading. It is authored
      // deliberately, it is the label a visitor sees on a source link, and in
      // the supplied bundle the two differ — the projects document is titled
      // "Terry Mathew — Projects" and headed "Terry Mathew — Personal Projects".
      title: frontmatter.title ?? /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? humanize(file),
      body,
    };
  })
  .filter((s) => !SKIP.has(s.file) && !s.file.startsWith("_") && s.body.trim().length > 0)
  .sort((a, b) => a.id.localeCompare(b.id));

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
  return syncKnowledgeIndex(bindings, SOURCES, force);
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
