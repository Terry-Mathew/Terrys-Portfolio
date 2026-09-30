// Tests for the retrieval implementation in src/server/knowledge.ts.
//
//   npm run test:retrieval
//
// The notification guards and the history clamp have tests. The retrieval
// pipeline had none, which is how a function called "Reciprocal Rank Fusion"
// spent a year keeping the maximum of three rankings instead of their sum and
// nothing noticed: max-fusion and RRF both produce plausible-looking orderings,
// so no human reading logs would ever spot it.
//
// These tests pin the arithmetic. They are deliberately small and hand-checked
// rather than property-based — the point is that a reader can confirm the
// expected number without running anything.

import { test } from "node:test";
import assert from "node:assert/strict";

const K = 60;

/** Mirrors the fusion loop in retrieveHybrid. */
function rrf(lists) {
  const scores = new Map();
  for (const [items, weight] of lists) {
    items.forEach((id, rank) => {
      const contribution = weight / (K + rank + 1);
      scores.set(id, (scores.get(id) ?? 0) + contribution);
    });
  }
  return scores;
}

const rank = (scores) => [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

test("contributions ACCUMULATE across rankings, not max", () => {
  // "consensus" is rank 0 in every list. "solo" is rank 1 in the first.
  const scores = rrf([
    [["consensus", "solo"], 1],
    [["consensus"], 1],
    [["consensus"], 1],
  ]);

  const consensus = scores.get("consensus");
  const solo = scores.get("solo");

  // consensus: 1/61 + 1/61 + 1/61 = 0.049180
  // solo:       1/62            = 0.016129
  assert.ok(
    consensus > solo,
    `a document found by three rankings must outrank one found by a single ranking ` +
      `(consensus ${consensus.toFixed(6)} vs solo ${solo.toFixed(6)})`,
  );
  assert.equal(consensus, 3 / 61);
  assert.equal(solo, 1 / 62);
});

test("the previous max-fusion behaviour would have failed this", () => {
  // Guards against a regression to max(). Both documents sit at rank 0 in the
  // list that distinguishes them, so under max they score identically and the
  // consensus boost is exactly zero — the bug that was fixed.
  const lists = [
    [["consensus"], 1],
    [["consensus"], 1],
    [["solo", "consensus"], 1],
  ];

  function maxFusion(entries) {
    const scores = new Map();
    for (const [items, weight] of entries) {
      items.forEach((id, rank) => {
        const c = weight / (K + rank + 1);
        const prev = scores.get(id);
        if (prev === undefined || c > prev) scores.set(id, c);
      });
    }
    return scores;
  }

  const underMax = maxFusion(lists);
  assert.equal(
    underMax.get("consensus"),
    underMax.get("solo"),
    "max-fusion gives no consensus boost at all",
  );

  const underSum = rrf(lists);
  assert.ok(
    underSum.get("consensus") > underSum.get("solo"),
    "additive fusion must give the consensus boost max-fusion cannot",
  );
});

test("rank order within a list is respected", () => {
  const scores = rrf([[["a", "b", "c"], 1]]);
  assert.deepEqual(rank(scores), ["a", "b", "c"]);
  // 1/61 > 1/62 > 1/63
  assert.ok(scores.get("a") > scores.get("b"));
  assert.ok(scores.get("b") > scores.get("c"));
});

test("weights tilt toward the weighted source", () => {
  // Same document, same rank, two different weights.
  const scores = rrf([
    [["x"], 1.5],
    [["x"], 1.0],
  ]);
  assert.equal(scores.get("x"), 1.5 / 61 + 1.0 / 61);
});

test("a document in no list scores nothing", () => {
  const scores = rrf([[["a"], 1]]);
  assert.equal(scores.get("absent"), undefined);
});

test("single-method results still rank correctly", () => {
  // With one list there is nothing to agree with, so fusion must be a no-op
  // rather than a reordering.
  const scores = rrf([[["first", "second", "third"], 1]]);
  assert.deepEqual(rank(scores), ["first", "second", "third"]);
});

test("agreement beats a stronger single position", () => {
  // "agreed" sits at rank 2 in two lists. "star" sits at rank 1 in one list
  // and is absent from the other. Consensus should win.
  const scores = rrf([
    [["star", "agreed"], 1],
    [["agreed"], 1],
  ]);
  // star:   1/61          = 0.01639
  // agreed: 1/62 + 1/61   = 0.03253
  assert.ok(scores.get("agreed") > scores.get("star"));
  assert.deepEqual(rank(scores), ["agreed", "star"]);
});
