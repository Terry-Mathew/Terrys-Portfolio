// Retrieval provenance and the degraded flag.
//
//   npm run test:provenance
//
// A retrieval-cache hit used to report `retrievalMode: "static"` with
// `degraded: true`, because the cache overwrote each result's `source` with
// "cache" and the classifier then built its set from the results that were NOT
// cache — leaving it empty and concluding no index had answered.
//
// Found in production, on a fully healthy index, after deploy:
//
//   call 1 (cold): retrievalMode=hybrid  cached=false  degraded=false
//   call 2 (warm): retrievalMode=static  cached=true   degraded=true
//
// Same question, same build, one call apart. The visitor's availability dot
// read "Limited mode", the stream emitted a false `static/openrouter` warning,
// and the eval reported the vector index as probably empty.
//
// The rule these tests pin: `source` is where a result came from and
// `fromCache` is whether this turn re-derived it. The two are independent, and
// the degraded flag is never set from a cache.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { scoreCase } from "./eval-gate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");

/** Mirrors the classifier in runChat. */
function classifyRetrieval(results) {
  const cached = results.some((r) => r.fromCache === true);
  const methods = new Set(results.map((r) => r.source));
  let retrievalMode = "static";
  if (methods.size === 1) retrievalMode = methods.has("static") ? "static" : "vector";
  else if (methods.size > 1) retrievalMode = "hybrid";
  return { retrievalMode, cached };
}

/** Mirrors the `degraded` computation in runChat. */
const isDegraded = ({ retrievalMode }, generation) =>
  generation === "none" || retrievalMode === "static";

const r = (source, fromCache) => ({
  id: `${source}-${Math.random().toString(36).slice(2, 7)}`,
  source,
  ...(fromCache === undefined ? {} : { fromCache }),
});

const answered = (retrievalMode, extra = {}) => ({
  text: "An answer.",
  meta: { retrievalMode, ...extra },
});

// ------------------------------------------------------- 1. cold retrieval

test("cold hybrid retrieval reports hybrid and is healthy", () => {
  const results = [r("static"), r("vector"), r("vector"), r("bm25")];
  const meta = classifyRetrieval(results);
  assert.equal(meta.retrievalMode, "hybrid");
  assert.equal(meta.cached, false);
  assert.equal(isDegraded(meta, "openrouter"), false);
});

test("cold vector-only retrieval reports vector and is healthy", () => {
  const meta = classifyRetrieval([r("vector"), r("vector"), r("vector")]);
  assert.equal(meta.retrievalMode, "vector");
  assert.equal(meta.cached, false);
  assert.equal(isDegraded(meta, "openrouter"), false);
});

test("BM25-only retrieval is still an index, so it is not degraded", () => {
  // Reported as "vector" because the mode describes the retrieval system, not
  // the specific store. A D1 FTS index answering is not a keyword-table
  // fallback.
  const meta = classifyRetrieval([r("bm25"), r("bm25")]);
  assert.equal(meta.retrievalMode, "vector");
  assert.equal(isDegraded(meta, "openrouter"), false);
});

// -------------------------------------------------- 2. warm retrieval cache
// This is the regression. It fails on the pre-fix classifier.

test("a warm retrieval-cache hit reports its vector provenance, not static", () => {
  const meta = classifyRetrieval([
    r("vector", true),
    r("vector", true),
    r("vector", true),
    r("vector", true),
  ]);
  assert.equal(meta.retrievalMode, "vector", "cached results are still vector results");
});

test("a warm retrieval-cache hit is never marked degraded", () => {
  const meta = classifyRetrieval([r("vector", true), r("vector", true)]);
  assert.equal(meta.cached, true, "cache provenance is reported separately");
  assert.equal(
    isDegraded(meta, "openrouter"),
    false,
    "a cache hit is not evidence about index health",
  );
});

test("a mixed cache and live result is hybrid, and healthy", () => {
  const meta = classifyRetrieval([r("vector", true), r("bm25"), r("static")]);
  assert.equal(meta.retrievalMode, "hybrid");
  assert.equal(meta.cached, true);
  assert.equal(isDegraded(meta, "openrouter"), false);
});

test("the eval scorer does not flag a cached static-mode turn as degraded", () => {
  // Belt and braces: even if a turn arrives reporting static, a cache means the
  // mode is a replay, not a reading of this turn's index.
  const served = scoreCase(
    { question: "what is settle", category: "retrieval", requires: ["money"] },
    answered("static", { cached: true }),
  );
  assert.equal(
    served.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );

  const replayed = scoreCase(
    { question: "what is settle", category: "retrieval", requires: ["money"] },
    answered("static", { answerCached: true }),
  );
  assert.equal(
    replayed.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

// ------------------------------------------------- 3. genuine static fallback

test("a genuine live static fallback is still reported and still degraded", () => {
  const meta = classifyRetrieval([r("static"), r("static"), r("static")]);
  assert.equal(meta.retrievalMode, "static");
  assert.equal(meta.cached, false);
  assert.equal(
    isDegraded(meta, "openrouter"),
    true,
    "the keyword table answering instead of an index is the fault this flag exists for",
  );
});

test("a live static fallback is flagged by the eval scorer", () => {
  const s = scoreCase(
    { question: "what is settle", category: "retrieval", requires: ["money"] },
    answered("static", { cached: false }),
  );
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    true,
  );
  assert.equal(
    s.problems.every((p) => p.kind === "content"),
    true,
    "a fallback that still answers is content, so it warns rather than blocks",
  );
});

test("no model at all is degraded regardless of retrieval", () => {
  assert.equal(isDegraded({ retrievalMode: "hybrid" }, "none"), true);
  assert.equal(isDegraded({ retrievalMode: "vector" }, "none"), true);
});

// ------------------------------------------------------- 4. out-of-scope

test("an out-of-scope question retrieves nothing and reports static", () => {
  const meta = classifyRetrieval([]);
  assert.equal(meta.retrievalMode, "static");
  assert.equal(meta.cached, false);
});

test("an out-of-scope question is not flagged by the eval scorer", () => {
  // "Are you single" should match nothing. The model deflects from NO_CONTEXT,
  // which is the intended behaviour, so the scorer must not report a dead
  // index on the strength of it.
  const s = scoreCase(
    { question: "are you single", category: "behaviour", forbids: ["girlfriend"] },
    answered("static", { cached: false }),
  );
  assert.equal(s.pass, true);
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

// Known residual, pinned deliberately so a change to it is visible rather than
// silent. The server still writes the 10-minute degraded flag for an empty
// retrieval, because at that layer an index that is unavailable and an index
// that correctly matched nothing are indistinguishable: retrieveHybrid catches
// both failures internally and returns []. Only the scorer can tell them apart,
// from the case's category, and it does.
test("residual: an empty retrieval still sets the server-side degraded flag", () => {
  assert.equal(isDegraded(classifyRetrieval([]), "openrouter"), true);
});

// ---------------------------------------------------- source-level guards
//
// The tests above mirror production logic, so they would happily keep passing
// if production regressed. These read the source and fail on the specific
// changes that caused the incident.

test("no source path writes source: 'cache' anymore", () => {
  // Comments are stripped first. The prose explaining this incident quotes
  // `source: "cache"`, so a naive grep matches the explanation of the fix
  // rather than the fix, and a guard that cries wolf gets deleted.
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

  for (const file of ["src/server/knowledge.ts", "src/server/chat.ts"]) {
    const src = stripComments(read(file));
    assert.equal(
      /source:\s*"cache"/.test(src),
      false,
      `${file} still overwrites result provenance with "cache"`,
    );
    assert.equal(
      /r\.source\s*[!=]==?\s*"cache"/.test(src),
      false,
      `${file} still derives anything from source === "cache"`,
    );
  }
});

test("RetrievalResult carries fromCache and not a cache source", () => {
  const src = read("src/server/knowledge.ts");
  assert.match(src, /source:\s*"static"\s*\|\s*"vector"\s*\|\s*"bm25"/);
  assert.match(src, /fromCache\?:\s*boolean/);
});

test("the retrieval cache normalises legacy entries on read", () => {
  // Entries written before fromCache existed have source: "cache" on disk for
  // up to cacheTTL. Reading one verbatim would reintroduce the exact value the
  // union no longer allows.
  const src = read("src/server/knowledge.ts");
  assert.match(src, /source:\s*"vector"\s+as const,\s*\n\s*fromCache: true/);
});
