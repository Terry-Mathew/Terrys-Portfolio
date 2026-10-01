// Scoring and gate classification for the RAG evaluation.
//
// Split out of scripts/eval.mjs so it can be tested without a network, a
// deployed site, or a model that costs money to call.
//
// This is the load-bearing part of the deploy gate. The whole reason
// `.github/workflows/deploy.yml` can fail a push is the exit code computed at
// the bottom of this file, and the only observation of it is a run against
// production during a deploy — where a regression in the classification is
// indistinguishable from a bad day. So the classification is tested here, and
// the "GATE {…}" line is produced by the same function the tests assert on,
// rather than being printed separately and left to drift.

/** "The chatbot could not answer." Blocks a deploy. */
export const availability = (text) => ({ kind: "availability", text });

/** "The chatbot answered, and got it wrong." Warns. */
export const content = (text) => ({ kind: "content", text });

const has = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());

/**
 * Score one golden case against one live answer.
 *
 * `requires` is ANY-match: a case listing ["money", "debt", "clar"] passes if
 * the answer contains one of them. Requiring all of them would fail correct
 * answers that simply use different words — the model behaving correctly and
 * the test being wrong.
 *
 * `forbids` is ALL-match on absence: any one of them fails the case.
 */
export function scoreCase(c, result) {
  const problems = [];

  if (!result.text.trim()) {
    return { pass: false, problems: [availability("empty answer")] };
  }

  if (result.meta?.rateLimited) {
    return {
      pass: false,
      problems: [availability("RATE LIMITED — raise EVAL_PACE_MS or the server limit")],
    };
  }
  if (result.meta?.generation === "none" || result.meta?.provider === "none") {
    problems.push(
      availability("NO MODEL ANSWERED — every provider tier was unavailable for this case"),
    );
  }

  const needs = c.requires ?? [];
  if (needs.length && !needs.some((n) => has(result.text, n))) {
    problems.push(content(`none of [${needs.join(", ")}] present`));
  }

  for (const ban of c.forbids ?? []) {
    if (has(result.text, ban)) problems.push(content(`forbidden "${ban}" present`));
  }

  // `retrievalMode: "static"` does NOT mean the index is dead, and treating it
  // as if it did produced a "the vector index is probably empty" warning on
  // healthy runs. Two cases where static is the correct answer:
  //
  //  - An out-of-scope question. "Are you single" should match nothing, so no
  //    live method contributes and the run is reported as static. The model
  //    then deflects from NO_CONTEXT, which is the intended behaviour.
  //  - A KV retrieval-cache hit. `retrieveVector` returns early on a cache hit
  //    and never calls Vectorize at all, so a cached question has no live
  //    vector or BM25 contribution to report even though the index is
  //    perfectly healthy.
  //
  // So this only flags a retrieval case that ran live and still found nothing
  // outside the hand-written keyword table — which is the actual fault.
  const expectsRetrieval =
    (c.category ?? (c.requires?.length ? "retrieval" : "behaviour")) === "retrieval";
  if (result.meta?.retrievalMode === "static" && expectsRetrieval && !result.meta?.cached) {
    problems.push(content("DEGRADED: static fallback, not vector retrieval"));
  }

  return { pass: problems.length === 0, problems };
}

export const ofKind = (results, kind) =>
  results.filter((r) => (r.problems ?? []).some((p) => p.kind === kind));

/**
 * Turn a run's results into the single decision the workflow branches on.
 *
 * The gate blocks on exactly three things, and the third is the one that is
 * easy to get wrong:
 *
 *   1. any case rate limited          — the suite is being throttled, or the
 *                                       site is, and the score is meaningless
 *   2. any case no model answered     — a visitor is getting source text
 *                                       instead of an answer
 *   3. nothing passed at all          — every case can individually look like a
 *                                       small content miss while the chatbot
 *                                       is in fact answering the wrong things
 *
 * Anything else warns. A 50% score from a working chatbot and a 50% score from
 * a broken one are the same number and opposite decisions, which is why the
 * classification happens here rather than being read off a pass count.
 */
export function classifyGate(results) {
  const passed = results.filter((r) => r.pass).length;
  const availabilityFails = ofKind(results, "availability");
  const contentFails = results.filter((r) => r.pass === false && !availabilityFails.includes(r));
  const degraded = ofKind(results, "content").filter((r) =>
    (r.problems ?? []).some((p) => p.text.startsWith("DEGRADED")),
  );

  const isDown = availabilityFails.length > 0 || passed === 0;
  // Guarded against an empty run, because `passed === results.length` is
  // vacuously true when both are 0 — so an evaluation that somehow produced no
  // cases at all would exit 0, pass the deploy, and report a clean bill of
  // health for a chatbot it never once asked a question. A gate that fails open
  // is worse than no gate.
  const isClean = results.length > 0 && passed === results.length;

  return {
    passed,
    total: results.length,
    availabilityFailures: availabilityFails.length,
    contentFailures: contentFails.length,
    degraded: degraded.length,
    availability: isDown,
    clean: isClean,
    // 1 blocks the deploy, 2 does not. Distinct codes so the workflow branches
    // on the class of failure rather than on the score.
    exitCode: isClean ? 0 : isDown ? 1 : 2,
  };
}

/**
 * The machine-readable summary line. One line, greppable, and derived from the
 * same object the tests assert on — the workflow reads this, not the table
 * printed above it.
 */
export function formatGateLine(summary) {
  return `GATE ${JSON.stringify({
    passed: summary.passed,
    total: summary.total,
    availabilityFailures: summary.availabilityFailures,
    contentFailures: summary.contentFailures,
    degraded: summary.degraded,
    availability: summary.availability,
    clean: summary.clean,
  })}`;
}
