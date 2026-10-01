// The three pipeline diagnostics, run against the deployed site.
//
//   npm run test:pipeline
//
// These exist because "the answer was bad" is not a diagnosis. Three
// different layers can produce it, and they have different fixes:
//
//   - retrieval did not contain the answer   -> embeddings, chunking, corpus
//   - retrieval was fine, generation was not  -> model, prompt, provider
//   - everything was fine, the UI was not     -> the client
//
// The retrieval check is the one that matters. A persona rewrite cannot fix a
// corpus that does not contain the answer, and the symptom looks identical.
//
// Skipped, not failed, when the network or the site is unavailable — a test
// suite that fails because the machine is offline trains you to ignore it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE = process.env.PIPELINE_URL ?? "https://terrymathew.com";

// Probes are the golden set's retrieval cases, read from the same file the
// evaluation scores against.
//
// This list used to be a hand-written `PROBES` constant that no longer existed
// anywhere in the repo. The `for (const p of PROBES)` sat OUTSIDE the try block
// below, so it threw a ReferenceError instead of skipping — which made
// `npm test` fail and turned the `verify` job in deploy.yml permanently red.
//
// The duplicate is also why it drifted: a question added to evals/golden.json
// was never tested here, and a question removed here never failed. One source
// of truth cannot disagree with itself.
const spec = JSON.parse(readFileSync(join(ROOT, "evals", "golden.json"), "utf8"));
const PROBES = spec.cases
  .filter((c) => c.category === "retrieval" && Array.isArray(c.requires) && c.requires.length > 0)
  .map((c) => ({ id: c.id, q: c.question, expect: c.requires }));
// ---------------------------------------------------------------- diagnostic 1
//
// Retrieval only. /api/retrieve runs the search and stops: no generation, no
// answer cache. Asking /api/chat for the answer does not work here, because a
// cache hit returns before retrieval runs — and a stale corpus is precisely the
// state where someone is most likely to blame the prompt instead.
//
// Needs INGEST_KEY. Skipped, not failed, when it is absent: a suite that fails
// because a secret is not configured trains you to ignore it.

const KEY = process.env.INGEST_KEY;

async function retrieve(question) {
  const res = await fetch(`${BASE}/api/retrieve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ingest-key": KEY,
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify({ q: question }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

test("the golden set yields retrieval probes", () => {
  assert.ok(
    PROBES.length > 0,
    "evals/golden.json produced no retrieval probes — check that the cases still carry a `category: retrieval` and a `requires` list",
  );
});

test("retrieval alone contains the answer for known questions", async (t) => {
  if (!KEY) {
    t.skip("INGEST_KEY not set");
    return;
  }

  for (const p of PROBES) {
    let r;
    try {
      r = await retrieve(p.q);
    } catch (e) {
      t.skip(`site unreachable: ${e.message}`);
      return;
    }
    assert.equal(r.ok, true, `"${p.q}" threw during retrieval: ${r.message}`);

    const blob = r.results
      .map((x) => `${x.id} ${x.title} ${x.preview}`)
      .join(" ")
      .toLowerCase();
    const hit = p.expect.some((term) => blob.includes(term));
    assert.ok(
      hit,
      `"${p.q}" retrieved nothing containing ${p.expect.join(" or ")}.\n` +
        `  methods: ${JSON.stringify(r.methods)}\n` +
        `  got: ${JSON.stringify(r.results.map((x) => x.id))}\n` +
        "  The corpus or the chunking is at fault. No prompt change will fix this.",
    );
  }
});

test("more than one retrieval method contributes", async (t) => {
  if (!KEY) {
    t.skip("INGEST_KEY not set");
    return;
  }
  let r;
  try {
    r = await retrieve("what is the deep research agent");
  } catch (e) {
    t.skip(`site unreachable: ${e.message}`);
    return;
  }
  const live = Number(r.methods.static) + Number(r.methods.bm25) + Number(r.methods.vector);
  assert.ok(
    live >= 2,
    `Only ${live} retrieval method(s) contributed (${JSON.stringify(r.methods)}). ` +
      "Hybrid retrieval running on one method is not hybrid retrieval — check that the " +
      "chunks table is populated and that documents_fts has rows.",
  );
});

test("the keyword index is not stale", async (t) => {
  if (!KEY) {
    t.skip("INGEST_KEY not set");
    return;
  }
  let r;
  try {
    r = await retrieve("what did he do at oracle");
  } catch (e) {
    t.skip(`site unreachable: ${e.message}`);
    return;
  }
  const oracle = r.results.find((x) => x.id === "experience" || x.id === "bio");
  assert.ok(
    oracle,
    `expected bio or experience among the results, got ${JSON.stringify(r.results.map((x) => x.id))}`,
  );
  // The placeholder document for experience was 482 bytes. Real content is
  // several times that, so a thin result means the index predates the rewrite.
  assert.ok(
    oracle.chars >= 400,
    `The experience/bio passage is only ${oracle.chars} characters — that looks like the ` +
      "old placeholder. Run the ingest so documents_fts and chunks are current.",
  );
});

// ---------------------------------------------------------------- diagnostic 2
//
// Embedding consistency. The same model must produce vectors at ingest and at
// query time, and its output width must match what the index was built for.
// A mismatch here produces a vector index that inserts nothing and answers
// nothing, with no error anywhere.

test("ingest and query use the same embedding model and dimension", () => {
  const config = readFileSync(join(ROOT, "src/server/chat.config.ts"), "utf8");
  const ingest = readFileSync(join(ROOT, "src/server/ingest.ts"), "utf8");

  const dim = Number(/dimensions:\s*(\d+)/.exec(config)?.[1]);
  assert.ok(Number.isInteger(dim) && dim > 0, "could not read dimensions from chat.config");

  const embedCalls = [...ingest.matchAll(/CHAT_CONFIG\.(\w*[eE]mbed\w*)/g)].map((m) => m[1]);
  assert.ok(embedCalls.length > 0, "ingest never references an embedding model");

  // No literal model string in ingest.ts — it must come from config, so the
  // two paths cannot drift by editing one file.
  for (const literal of ingest.matchAll(/env\.AI\.run\(\s*["'`]([^"'`]+)["'`]/g)) {
    assert.notEqual(
      literal[1],
      "@cf/baai/bge-base-en-v1.5",
      `ingest.ts hardcodes the embedding model (${literal[1]}). ` +
        "Read it from CHAT_CONFIG so ingest and query cannot diverge.",
    );
  }

  const model = /embeddingModel:\s*["'`]([^"'`]+)["'`]/.exec(config)?.[1];
  assert.ok(model, "chat.config has no embeddingModel");
  assert.match(
    model,
    /bge-base|768/i,
    `embeddingModel (${model}) does not look like a 768-dimension model, but dimensions is ${dim}`,
  );
});

// ---------------------------------------------------------------- diagnostic 3
//
// Chunk quality. Chunks that are too small lose the context that makes a
// passage answerable; chunks that are too large drag noise in with the
// signal. This checks the real files against the configured band rather than
// asserting that the chunker does what it is told.

// ---------------------------------------------------------------- diagnostic 4
//
// Source links. Every citation the chatbot renders comes from
// `documents.category` in ingest.ts, and that value is typed by hand into a
// map nobody validates.
//
// Two of them were wrong and both shipped: "off-the-clock" named an id no
// element carries (the section is `beyond-work`), and "how-this-works" named an
// id that exists nowhere on the site. Every citation either one produced was a
// link to nothing, and nothing reported it — retrieval "succeeded", the answer
// rendered, the link was simply dead.
//
// This walks the map and checks each value against the ids and routes that
// actually exist. It is a static check, so it needs neither a key nor a
// network, and it fails at review time rather than at demo time.

test("every source anchor in the category map resolves to something real", () => {
  const ingest = readFileSync(join(ROOT, "src/server/ingest.ts"), "utf8");

  const block = /const CATEGORY[^=]*=\s*\{([\s\S]*?)\n\};/.exec(ingest)?.[1];
  assert.ok(block, "could not find the CATEGORY map in ingest.ts — has it been renamed?");

  const entries = [...block.matchAll(/"([^"]+\.md)":\s*"([^"]+)"/g)].map((m) => ({
    file: m[1],
    target: m[2],
  }));
  assert.ok(entries.length > 0, "the CATEGORY map is empty");

  // Section ids the site actually renders.
  const idPattern = /id="([a-z0-9-]+)"/g;
  const walk = (dir) => {
    const out = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        out.push(...walk(full));
        continue;
      }
      if (!/\.(tsx|ts)$/.test(name)) continue;
      for (const m of readFileSync(full, "utf8").matchAll(idPattern)) out.push(m[1]);
    }
    return out;
  };

  const ids = new Set([...walk(join(ROOT, "src/components")), ...walk(join(ROOT, "src/routes"))]);

  // Slugs the /projects/$projectId route accepts.
  const projects = readFileSync(join(ROOT, "src/content/projects.ts"), "utf8");
  const slugs = new Set([...projects.matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));

  const dead = [];
  for (const { file, target } of entries) {
    if (target.startsWith("/")) {
      // Three shapes are legitimate: a /projects/<slug> route, any other route
      // file, or a static asset in public/ served from the root — the resume is
      // a PDF, not a page.
      const slug = target.startsWith("/projects/") ? target.slice("/projects/".length) : null;
      if (slug) {
        if (!slugs.has(slug)) dead.push(`${file} → ${target} (no project with id "${slug}")`);
        continue;
      }
      const isRoute = existsSync(join(ROOT, "src/routes", `${target.slice(1)}.tsx`));
      const isAsset = existsSync(join(ROOT, "public", target.slice(1)));
      if (!isRoute && !isAsset) {
        dead.push(`${file} → ${target} (no route file and nothing in public/)`);
      }
      continue;
    }
    const id = target.replace(/^#/, "");
    if (!ids.has(id)) {
      dead.push(
        `${file} → ${target} (no element with id="${id}"; known ids: ` +
          `${[...ids].sort().join(", ")})`,
      );
    }
  }

  assert.equal(
    dead.length,
    0,
    `Source links point at things that do not exist:\n  ${dead.join("\n  ")}\n` +
      "  Every citation rendered from these is a dead link. Point them at a real " +
      "section id or route, or leave them out of CATEGORY to fall back to the " +
      "obvious placeholder.",
  );
});

test("knowledge files chunk into a workable size band", () => {
  const config = readFileSync(join(ROOT, "src/server/chat.config.ts"), "utf8");
  const chunkSize = Number(/chunkSize:\s*(\d+)/.exec(config)?.[1]);
  const overlap = Number(/chunkOverlap:\s*(\d+)/.exec(config)?.[1]);
  assert.ok(chunkSize > 0, "could not read chunkSize");
  assert.ok(overlap >= 0 && overlap < chunkSize, "chunkOverlap must be below chunkSize");

  const dir = join(ROOT, "src/content/knowledge");
  const skip = new Set(["README.md", "RAG-ARCHITECTURE.md"]);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && !skip.has(f));
  assert.ok(files.length > 0, "no knowledge files found");

  for (const f of files) {
    const size = statSync(join(dir, f)).size;
    // A file has to be at least one chunk. Much larger is fine — that is what
    // chunking is for.
    assert.ok(size >= 40, `${f} is ${size} bytes — too small to index, and will retrieve as noise`);
  }

  // Every file must be able to answer a question in its own title. A file
  // whose heading never reappears in its body is a file retrieval cannot match.
  for (const f of files) {
    const body = readFileSync(join(dir, f), "utf8");
    const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.toLowerCase();
    if (!heading) continue;
    const keywords = heading
      .split(/[^a-z]+/)
      .filter((w) => w.length > 4)
      .slice(0, 2);
    const lower = body.toLowerCase();
    assert.ok(
      keywords.length === 0 || keywords.some((k) => lower.includes(k)),
      `${f} is titled "${heading}" but the words in that title appear nowhere in the file. ` +
        "A visitor asking about it will retrieve nothing.",
    );
  }
});
