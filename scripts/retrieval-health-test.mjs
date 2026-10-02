// Retrieval health: a correct miss is not a failure.
//
//   npm run test:retrieval-health
//
// A visitor asking "are you single" should match nothing. The corpus genuinely
// does not contain it, the model correctly deflects, and the answer is right.
// That turn was reporting `degraded: true` and flipping the panel's availability
// dot to "Limited mode" for ten minutes, because health was inferred from the
// result count — and an empty result set is indistinguishable from an index that
// is down.
//
// The server now reports which live methods ran and which failed. These tests
// pin that distinction and the flag behaviour that depends on it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

import { scoreCase, classifyGate } from "./eval-gate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Import the real `assessRetrieval` and `unrunRetrievalHealth` from
 * knowledge.ts, compiled on the fly.
 *
 * This matters more here than usual. The bug was a wrong rule, and a test file
 * that re-derives the rule proves only that the test file agrees with itself.
 * knowledge.ts cannot be imported directly — it pulls in the whole server — so
 * the two pure functions are extracted and compiled standalone. They are the
 * heart of the fix, and these tests run the code that ships.
 */
const knowledgeSrc = readFileSync(join(ROOT, "src", "server", "knowledge.ts"), "utf8");
const { outputText } = ts.transpileModule(knowledgeSrc, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const knowledge = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const { assessRetrieval, unrunRetrievalHealth } = knowledge;
assert.equal(
  typeof assessRetrieval,
  "function",
  "assessRetrieval must be exported from knowledge.ts",
);
assert.equal(typeof unrunRetrievalHealth, "function", "unrunRetrievalHealth must be exported");

// ------------------------------------------------------------------ fixtures

/** A live index that ran and found something. */
const withEvidence = (extra = {}) => ({
  text: "An answer.",
  meta: {
    retrievalMode: "vector",
    generation: "openrouter",
    retrieval: assessRetrieval({
      vectorRan: true,
      vectorFailed: false,
      bm25Ran: true,
      bm25Failed: false,
      resultCount: 4,
    }),
    ...extra,
  },
});

/**
 * A live index that ran cleanly and found nothing. This is the case the whole
 * change exists for.
 */
const healthyEmpty = (extra = {}) => ({
  text: "That's outside what this portfolio chatbot covers.",
  meta: {
    // Note the mode is "static" and the mode is *not* the signal any more.
    retrievalMode: "static",
    generation: "openrouter",
    retrieval: assessRetrieval({
      vectorRan: true,
      vectorFailed: false,
      bm25Ran: true,
      bm25Failed: false,
      resultCount: 0,
    }),
    ...extra,
  },
});

/** Vectorize threw. BM25 answered. */
const vectorFailed = () => ({
  text: "An answer from BM25.",
  meta: {
    retrievalMode: "vector",
    generation: "openrouter",
    retrieval: assessRetrieval({
      vectorRan: false,
      vectorFailed: true,
      bm25Ran: true,
      bm25Failed: false,
      resultCount: 3,
    }),
  },
});

/** The D1 FTS query threw. */
const bm25Failed = () => ({
  text: "An answer from the index.",
  meta: {
    retrievalMode: "vector",
    generation: "openrouter",
    retrieval: assessRetrieval({
      vectorRan: true,
      vectorFailed: false,
      bm25Ran: false,
      bm25Failed: true,
      resultCount: 3,
    }),
  },
});

/** No live method was ever attempted — static mode, or no bindings. */
const staticFallback = () => ({
  text: "A keyword-table answer.",
  meta: {
    retrievalMode: "static",
    generation: "openrouter",
    retrieval: unrunRetrievalHealth(),
  },
});

const behaviourCase = {
  question: "are you single",
  category: "behaviour",
  forbids: ["girlfriend"],
};
const retrievalCase = { question: "what is settle", category: "retrieval", requires: ["money"] };

/** Mirrors the server's own derivation, so the two are asserted to agree. */
const serverDegraded = (result) =>
  result.meta.generation === "none" || !result.meta.retrieval.healthy;

// ------------------------------------------- 1. healthy out-of-scope question

test("1. a healthy out-of-scope question is not degraded", () => {
  const r = healthyEmpty();
  assert.equal(serverDegraded(r), false, "the server must not flag this turn");
});

test("1b. a healthy out-of-scope question is not flagged by the scorer", () => {
  // The mode here is "static" and the results were empty. Neither fact means
  // anything on its own; this is the exact combination that used to produce
  // "the vector index is probably empty" on a healthy run.
  const s = scoreCase(behaviourCase, healthyEmpty());
  assert.equal(s.pass, true);
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

test("1c. the out-of-scope deflection still passes its forbids", () => {
  const s = scoreCase(behaviourCase, healthyEmpty());
  assert.equal(s.problems.filter((p) => p.kind === "content").length, 0);
});

// ------------------------------------------- 2. healthy empty retrieval

test("2. healthy empty retrieval reports empty but healthy", () => {
  const { meta } = healthyEmpty();
  assert.equal(meta.retrieval.healthy, true);
  assert.equal(meta.retrieval.empty, true);
  assert.deepEqual(meta.retrieval.failed, []);
  assert.equal(meta.retrieval.ran.length, 2);
});

test("2b. a healthy empty retrieval on a retrieval case is not degraded", () => {
  // A retrieval case can also legitimately come back empty. The corpus is ten
  // files; something outside them is a correct miss, not an index failure.
  const s = scoreCase(retrievalCase, healthyEmpty());
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

test("2c. cached and answer-cached healthy turns are not degraded", () => {
  for (const extra of [{ cached: true }, { answerCached: true }]) {
    const s = scoreCase(retrievalCase, healthyEmpty(extra));
    assert.equal(
      s.problems.some((p) => p.text.startsWith("DEGRADED")),
      false,
      JSON.stringify(extra),
    );
  }
});

// ------------------------------------------------- 3. Vectorize failure

test("3. a Vectorize failure is degraded even when BM25 answered", () => {
  const r = vectorFailed();
  assert.equal(serverDegraded(r), true, "a partial retrieval failure is still a failure");
  assert.deepEqual(r.meta.retrieval.failed, ["vector"]);
});

test("3b. the scorer names the failed method", () => {
  const s = scoreCase(retrievalCase, vectorFailed());
  const degraded = s.problems.find((p) => p.text.startsWith("DEGRADED"));
  assert.ok(degraded, "must be flagged");
  assert.match(degraded.text, /vector/);
  assert.equal(
    s.problems.every((p) => p.kind === "content"),
    true,
    "still an answer, so it warns rather than blocks",
  );
});

test("3c. a Vectorize failure is non-blocking", () => {
  const s = scoreCase(retrievalCase, vectorFailed());
  const g = classify([pass("a"), { id: "b", ...s }]);
  assert.equal(g.exitCode, 2);
});

// ---------------------------------------------------- 4. BM25 failure

test("4. a BM25 failure is degraded", () => {
  const r = bm25Failed();
  assert.equal(serverDegraded(r), true);
  assert.deepEqual(r.meta.retrieval.failed, ["bm25"]);
});

test("4b. the scorer names bm25 as the failed method", () => {
  const s = scoreCase(retrievalCase, bm25Failed());
  const degraded = s.problems.find((p) => p.text.startsWith("DEGRADED"));
  assert.ok(degraded);
  assert.match(degraded.text, /bm25/);
});

test("4c. both methods failing is degraded and says so", () => {
  const r = {
    text: "A keyword-table answer.",
    meta: {
      retrievalMode: "static",
      generation: "openrouter",
      retrieval: assessRetrieval({
        vectorRan: false,
        vectorFailed: true,
        bm25Ran: false,
        bm25Failed: true,
        resultCount: 2,
      }),
    },
  };
  assert.equal(serverDegraded(r), true);
  const s = scoreCase(retrievalCase, r);
  assert.match(s.problems.find((p) => p.text.startsWith("DEGRADED")).text, /vector, bm25/);
});

// ------------------------------------------- 5. genuine static fallback

test("5. a static fallback with no live method attempted is degraded", () => {
  const r = staticFallback();
  assert.equal(serverDegraded(r), true);
  assert.deepEqual(r.meta.retrieval.ran, []);
});

test("5b. the scorer flags a static fallback", () => {
  const s = scoreCase(retrievalCase, staticFallback());
  assert.ok(s.problems.some((p) => p.text.startsWith("DEGRADED")));
});

test("5c. no model at all is degraded whatever retrieval said", () => {
  const r = withEvidence({ generation: "none" });
  assert.equal(serverDegraded(r), true);
});

test("5d. a turn that never ran retrieval is not degraded", () => {
  // Empty question, over-long input, blocked keyword, rate limit: all returned
  // before retrieval is attempted. They have no `retrieval` field at all, and
  // reporting them as healthy-but-empty would be a lie about a method that
  // never ran.
  const s = scoreCase(behaviourCase, {
    text: "I'm here to answer questions about Terry.",
    meta: { retrievalMode: "static" },
  });
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

// --------------------------------------- 6. degraded KV flag behaviour

test("6. the KV flag follows the explicit degraded signal", () => {
  // Mirrors the route: it writes the flag from `metadata.degraded === true` and
  // nothing else, so the flag can only be as wrong as that boolean.
  const wouldFlag = (r) => r.meta.degraded === true;

  assert.equal(
    wouldFlag({ meta: { degraded: false, retrieval: healthyEmpty().meta.retrieval } }),
    false,
  );
  assert.equal(
    wouldFlag({ meta: { degraded: false, retrieval: withEvidence().meta.retrieval } }),
    false,
  );
  assert.equal(
    wouldFlag({ meta: { degraded: true, retrieval: staticFallback().meta.retrieval } }),
    true,
  );
  assert.equal(
    wouldFlag({ meta: { degraded: true, retrieval: vectorFailed().meta.retrieval } }),
    true,
  );
});

test("6b. degraded and retrieval.healthy can never disagree", () => {
  // The flag and the health object are reported together. If they disagree,
  // something reading one of them is wrong, and the dot will eventually
  // contradict itself.
  for (const r of [
    withEvidence(),
    healthyEmpty(),
    vectorFailed(),
    bm25Failed(),
    staticFallback(),
  ]) {
    const expected = r.meta.generation === "none" || !r.meta.retrieval.healthy;
    assert.equal(serverDegraded(r), expected);
  }
});

test("6c. an answered turn is never degraded solely for returning nothing", () => {
  // The whole point. Retrieval working and finding nothing must not reach the
  // availability flag, or a single out-of-scope question marks the chatbot
  // unavailable for the next ten minutes.
  for (const r of [healthyEmpty(), withEvidence()]) {
    assert.equal(r.meta.retrieval.failed.length, 0);
    assert.equal(serverDegraded(r), false);
  }
});

// -------------------------------------------------------- legacy fallback

test("the scorer keeps its old heuristic for a build with no health field", () => {
  // A turn from before this change has no `retrieval`, and must not be scored
  // as healthy by default.
  const s = scoreCase(retrievalCase, {
    text: "An answer.",
    meta: { retrievalMode: "static", generation: "openrouter" },
  });
  assert.ok(s.problems.some((p) => p.text.startsWith("DEGRADED")));
});

test("a live non-static mode with no health field is not flagged", () => {
  const s = scoreCase(retrievalCase, {
    text: "An answer.",
    meta: { retrievalMode: "hybrid", generation: "openrouter" },
  });
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

// ------------------------------- the real function, called directly

test("assessRetrieval: both methods ran and matched nothing is healthy and empty", () => {
  const h = assessRetrieval({
    vectorRan: true,
    vectorFailed: false,
    bm25Ran: true,
    bm25Failed: false,
    resultCount: 0,
  });
  assert.equal(h.healthy, true);
  assert.equal(h.empty, true);
  assert.deepEqual(h.failed, []);
});

test("assessRetrieval: no method ran at all is not healthy", () => {
  const h = assessRetrieval({
    vectorRan: false,
    vectorFailed: false,
    bm25Ran: false,
    bm25Failed: false,
    resultCount: 0,
  });
  assert.equal(h.healthy, false, "nothing ran, so nothing can be called healthy");
});

test("assessRetrieval: a method that ran and found results is healthy and not empty", () => {
  const h = assessRetrieval({
    vectorRan: true,
    vectorFailed: false,
    bm25Ran: true,
    bm25Failed: false,
    resultCount: 4,
  });
  assert.equal(h.healthy, true);
  assert.equal(h.empty, false);
});

test("assessRetrieval: any single method failure makes the turn not healthy", () => {
  for (const flags of [{ vectorFailed: true }, { bm25Failed: true }]) {
    const h = assessRetrieval({
      vectorRan: true,
      vectorFailed: false,
      bm25Ran: true,
      bm25Failed: false,
      resultCount: 3,
      ...flags,
    });
    assert.equal(h.healthy, false, JSON.stringify(flags));
  }
});

test("unrunRetrievalHealth is not healthy and reports nothing as having run", () => {
  const h = unrunRetrievalHealth();
  assert.equal(h.healthy, false);
  assert.deepEqual(h.ran, []);
  assert.deepEqual(h.failed, []);
});

// ------------------------------------- static guards on the server wiring
//
// The fixtures above are built by the real function, but the server could still
// ignore it. These fail if the wiring is undone.

test("the server derives degraded from retrieval health, not from the mode", () => {
  const chat = readFileSync(join(ROOT, "src", "server", "chat.ts"), "utf8");
  assert.match(chat, /degraded: generated\.provider === "none" \|\| !retrieval\.healthy/);
  assert.equal(
    /degraded:[^\n]*retrievalMode === "static"/.test(chat),
    false,
    "chat.ts must not infer health from retrievalMode again",
  );
});

test("retrieveHybrid reports per-method success instead of inferring from results", () => {
  const knowledge2 = readFileSync(join(ROOT, "src", "server", "knowledge.ts"), "utf8");
  for (const marker of ["vectorRan", "bm25Ran", "vectorFailed", "bm25Failed", "assessRetrieval"]) {
    assert.ok(knowledge2.includes(marker), `knowledge.ts lost ${marker}`);
  }
});

// ------------------------------------------------------------------ helpers

const pass = (id) => ({ id, pass: true, problems: [], ms: 100, category: "retrieval" });

const classify = (results) => classifyGate(results);
