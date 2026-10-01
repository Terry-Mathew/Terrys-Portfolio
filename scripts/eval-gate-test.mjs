// The deploy gate's decision, tested without a network or a model.
//
//   npm run test:gate
//
// `.github/workflows/deploy.yml` blocks a push on the exit code of
// `scripts/eval.mjs`, and that code is the only thing standing between a dead
// chatbot and production. Until now the sole observation of it was a run
// against the live site during a deploy — where "the gate stopped blocking" and
// "provider quota blip" look exactly the same, and "the gate started blocking
// everything" just looks like a broken pipeline.
//
// So the classification is pinned here. If a refactor of scoreCase, classifyGate
// or the exit code changes what blocks a deploy, this fails.

import { test } from "node:test";
import assert from "node:assert/strict";

import { availability, classifyGate, content, formatGateLine, scoreCase } from "./eval-gate.mjs";

/** A case that passes cleanly — the baseline everything is measured against. */
const pass = (id = "ok") => ({
  id,
  pass: true,
  problems: [],
  ms: 100,
  category: "retrieval",
});

/** Score a live-shaped result through the real scorer. */
const scored = (question, result, extra = {}) => {
  const s = scoreCase({ question, ...extra }, result);
  return { id: question, ms: 100, category: "retrieval", ...s };
};

const answered = (text, meta = {}) => ({ text, meta: { retrievalMode: "hybrid", ...meta } });

// ---------------------------------------------------------------- scoring

test("requires is ANY-match, not ALL-match", () => {
  const c = { question: "what is settle", requires: ["money", "debt", "clar"] };
  assert.equal(scoreCase(c, answered("It is about money")).pass, true);
  // Requiring all three would fail correct answers that use different words.
  assert.equal(scoreCase(c, answered("It is about debt")).pass, true);
  assert.equal(scoreCase(c, answered("It is about spreadsheets")).pass, false);
});

test("forbids fails on any one match", () => {
  const c = { question: "are you single", forbids: ["girlfriend", "married"] };
  assert.equal(scoreCase(c, answered("Territory I don't cover.")).pass, true);
  assert.equal(scoreCase(c, answered("I have a girlfriend")).pass, false);
});

test("a forbidden fact is content, not availability", () => {
  // Deliberate, and the easiest rule here to get wrong in either direction.
  // Blocking on it would let a single bad case stop every deploy; ignoring it
  // would let a chatbot that invents private facts ship quietly. The gate
  // blocks on three specific conditions and this is not one of them.
  const s = scoreCase(
    { question: "are you single", forbids: ["girlfriend"] },
    answered("girlfriend"),
  );
  assert.equal(s.pass, false);
  assert.equal(
    s.problems.every((p) => p.kind === "content"),
    true,
  );
  // Paired with a passing case, so the "nothing passed at all" rule is not
  // what is being measured — this isolates the kind of the problem alone.
  const g = classifyGate([pass("a"), { id: "b", ...s }]);
  assert.equal(g.availabilityFailures, 0);
  assert.equal(g.exitCode, 2, "a forbidden fact must not block the deploy on its own");
});

test("an empty answer is availability", () => {
  const s = scoreCase({ question: "what is settle" }, { text: "   ", meta: {} });
  assert.equal(s.pass, false);
  assert.equal(s.problems[0].kind, "availability");
});

// ---------------------------------------------------------------- exit codes

test("a clean run exits 0", () => {
  const g = classifyGate([pass("a"), pass("b"), pass("c")]);
  assert.equal(g.exitCode, 0);
  assert.equal(g.clean, true);
  assert.equal(g.availability, false);
  assert.equal(g.passed, 3);
  assert.equal(g.total, 3);
});

test("a content miss exits 2, not 1 — the deploy must not be blocked", () => {
  const g = classifyGate([
    pass("a"),
    scored("what is settle", answered("It is a thing."), { requires: ["money"] }),
    pass("c"),
  ]);
  assert.equal(g.exitCode, 2);
  assert.equal(g.availability, false);
  assert.equal(g.clean, false);
  assert.equal(g.contentFailures, 1);
  assert.equal(g.passed, 2);
});

test("a rate limited case exits 1", () => {
  const limited = scored("what is settle", answered("Too many questions", { rateLimited: true }));
  const g = classifyGate([pass("a"), limited]);
  assert.equal(limited.problems[0].kind, "availability");
  assert.equal(g.exitCode, 1);
  assert.equal(g.availability, true);
  assert.equal(g.availabilityFailures, 1);
});

test("a case no model answered exits 1", () => {
  for (const field of ["generation", "provider"]) {
    const none = scored(
      "what is settle",
      answered("From the knowledge base…", { [field]: "none" }),
    );
    assert.equal(none.problems[0].kind, "availability", `via ${field}`);
    assert.equal(classifyGate([pass("a"), none]).exitCode, 1, `via ${field}`);
  }
});

test("a request that never completed exits 1", () => {
  const g = classifyGate([
    pass("a"),
    { id: "b", pass: false, problems: [availability("request failed: x")] },
  ]);
  assert.equal(g.exitCode, 1);
  assert.equal(g.availability, true);
});

test("a degraded retrieval is content, not availability", () => {
  // The chatbot answered from the keyword table. That is a real fault but the
  // visitor still got an answer, and the ingest step in deploy.yml already
  // fails hard on a static probe — blocking twice buys nothing.
  const s = scored("what is settle", answered("An answer", { retrievalMode: "static" }), {
    category: "retrieval",
  });
  assert.equal(
    s.problems.every((p) => p.kind === "content"),
    true,
  );
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    true,
  );
  assert.equal(classifyGate([pass("a"), s]).exitCode, 2);
});

test("a request that never completed is availability", () => {
  assert.equal(availability("x").kind, "availability");
  assert.equal(content("x").kind, "content");
});

// ---------------------------------------------------------------- the rule
// that is easy to get wrong

test("nothing passing at all exits 1, even with zero availability tags", () => {
  // Every case individually looks like a small content miss. Together they are
  // a chatbot that is answering the wrong things, which is the failure the gate
  // exists to catch. Without this rule a total wipeout of the golden set
  // deploys as a yellow warning.
  const results = [
    scored("a", answered("nope"), { requires: ["x"] }),
    scored("b", answered("nope"), { requires: ["y"] }),
    scored("c", answered("nope"), { requires: ["z"] }),
  ];
  const g = classifyGate(results);
  assert.equal(g.availabilityFailures, 0);
  assert.equal(g.passed, 0);
  assert.equal(g.availability, true, "zero passing must be treated as unavailable");
  assert.equal(g.exitCode, 1);
});

test("a single passing case with content misses does NOT trip the zero rule", () => {
  const g = classifyGate([
    pass("a"),
    scored("b", answered("nope"), { requires: ["x"] }),
    scored("c", answered("nope"), { requires: ["y"] }),
  ]);
  assert.equal(g.passed, 1);
  assert.equal(g.exitCode, 2);
});

test("an empty result set does not report a clean pass", () => {
  // passed === total === 0, so `isClean` is vacuously true. There is nothing
  // here, which is not a pass.
  const g = classifyGate([]);
  assert.equal(g.total, 0);
  assert.equal(g.passed, 0);
  assert.equal(g.availability, true);
  assert.equal(g.exitCode, 1);
});

// ---------------------------------------------------------------- the line
// the workflow greps

test("the GATE line is one line of parseable JSON with the blocking signal", () => {
  const line = formatGateLine(classifyGate([pass("a"), pass("b")]));
  assert.equal(line.includes("\n"), false, "must stay a single line");

  const json = line.slice(line.indexOf("{"));
  const parsed = JSON.parse(json);

  assert.deepEqual(Object.keys(parsed).sort(), [
    "availability",
    "availabilityFailures",
    "clean",
    "contentFailures",
    "degraded",
    "passed",
    "total",
  ]);
  assert.equal(parsed.availability, false);
  assert.equal(parsed.clean, true);
  assert.equal(parsed.passed, 2);
  assert.equal(parsed.total, 2);
  // The blocking signal the workflow branches on.
  assert.equal(typeof parsed.availability, "boolean");
});

test("the GATE line reports availability true when the gate blocks", () => {
  const g = classifyGate([{ id: "b", pass: false, problems: [availability("request failed")] }]);
  const parsed = JSON.parse(formatGateLine(g).slice(formatGateLine(g).indexOf("{")));
  assert.equal(parsed.availability, true);
  assert.equal(parsed.availabilityFailures, 1);
  assert.equal(parsed.passed, 0);
});

test("the exit code and the availability flag can never disagree", () => {
  // The workflow branches on the exit code; a human reads the line. If these
  // drift, one of them is lying about whether the deploy is blocked.
  const shapes = [
    [pass("a")],
    [pass("a"), scored("b", answered("x"), { requires: ["zzz"] })],
    [scored("b", answered("x"), { requires: ["zzz"] })],
    [scored("b", answered("x", { rateLimited: true }))],
    [scored("b", answered("x", { generation: "none" }))],
    [],
  ];
  for (const results of shapes) {
    const g = classifyGate(results);
    assert.equal(
      g.exitCode === 1,
      g.availability,
      `shape ${JSON.stringify(results.map((r) => r.pass))}`,
    );
  }
});

// ------------------------------------------------- the DEGRADED false positive
//
// `retrievalMode: "static"` was flagged unconditionally, which ended healthy
// runs with "the vector index is probably empty". Two things produce a correct
// static mode, and both were being reported as a fault.

test("an out-of-scope question is not a degraded index", () => {
  // "Are you single" should match nothing. No live method contributes, the run
  // reports static, and the model deflects from NO_CONTEXT — the intended
  // behaviour, not a fault.
  const s = scoreCase(
    { question: "are you single", category: "behaviour", forbids: ["girlfriend"] },
    answered("That's closer to a work sample than a dating profile.", {
      retrievalMode: "static",
    }),
  );
  assert.equal(s.pass, true);
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

test("a KV retrieval-cache hit is not a degraded index", () => {
  // retrieveVector returns early on a cache hit and never calls Vectorize, so a
  // cached retrieval has no live vector contribution to report.
  const s = scoreCase(
    { question: "what is settle", category: "retrieval", requires: ["money"] },
    answered("It is about money.", { retrievalMode: "static", cached: true }),
  );
  assert.equal(s.pass, true);
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});

test("a retrieval case that ran live and found nothing IS degraded", () => {
  // The narrow remaining case: no cache, a question that should match, and only
  // the hand-written keyword table answered.
  const s = scoreCase(
    { question: "what is settle", category: "retrieval", requires: ["money"] },
    answered("It is about money.", { retrievalMode: "static", cached: false }),
  );
  assert.equal(
    s.problems.some((p) => p.text.startsWith("DEGRADED")),
    true,
  );
});

test("category is inferred when the golden case omits it", () => {
  // requires present implies a retrieval case; forbids only implies behaviour.
  const retrievalish = scoreCase(
    { question: "q", requires: ["money"] },
    answered("x", { retrievalMode: "static" }),
  );
  assert.equal(
    retrievalish.problems.some((p) => p.text.startsWith("DEGRADED")),
    true,
  );

  const behavioural = scoreCase(
    { question: "q", forbids: ["girlfriend"] },
    answered("x", { retrievalMode: "static" }),
  );
  assert.equal(
    behavioural.problems.some((p) => p.text.startsWith("DEGRADED")),
    false,
  );
});
