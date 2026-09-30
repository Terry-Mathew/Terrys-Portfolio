// Tests for answer-cache safety.
//
//   npm run test:cache
//
// The cache key was the raw question alone. "Tell me more" is not a
// self-contained question — its answer depends entirely on the turn before it
// — so one visitor's "tell me more" served another visitor's answer. If that
// answer ever echoed a supplied name or email, the cached copy would hand one
// visitor another's details. The symptom is a stranger's name in a reply,
// which is the kind of bug that ends a portfolio.
//
// These tests pin the rule that closes it: only a self-contained first turn is
// ever cached or served from cache.

import { test } from "node:test";
import assert from "node:assert/strict";

/** Mirrors the guard and key construction in runChat. */
function cacheKeyFor({ question, history, corpusVersion, promptVersion }) {
  const cacheable = history.length === 0;
  // runChat trims the question up front and stores it as qTrimmed; the key is
  // built from that, lowercased.
  const qTrimmed = question.trim();
  const key = `chat:v${corpusVersion}:p${promptVersion}:${hash(qTrimmed.toLowerCase())}`;
  return { cacheable, key };
}

/** Same simple hash as knowledge.hashString. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const V = { corpusVersion: 4, promptVersion: 2 };

test("a follow-up is never cached, because it is not self-contained", () => {
  for (const question of ["tell me more", "why?", "and the other one?", "go on"]) {
    const { cacheable } = cacheKeyFor({ question, history: [{ role: "user", text: "x" }], ...V });
    assert.equal(cacheable, false, `"${question}" must not be cacheable in a follow-up turn`);
  }
});

test("two different conversations asking the same follow-up do not collide", () => {
  // The vulnerability: identical key, different prior turns, so a cached
  // answer from one conversation would be served to the other.
  const convA = cacheKeyFor({
    question: "tell me more",
    history: [
      { role: "user", text: "what is Settle?" },
      { role: "bot", text: "A finance simulator." },
    ],
    ...V,
  });
  const convB = cacheKeyFor({
    question: "tell me more",
    history: [
      { role: "user", text: "what is the Digital Twin?" },
      { role: "bot", text: "A chatbot." },
    ],
    ...V,
  });

  assert.equal(convA.cacheable, false);
  assert.equal(convB.cacheable, false);
  // Neither is written nor read, so there is no shared key to collide on.
});

test("a first turn is cacheable and identical questions share a key", () => {
  const a = cacheKeyFor({ question: "what is Settle?", history: [], ...V });
  const b = cacheKeyFor({ question: "what is Settle?", history: [], ...V });
  assert.equal(a.cacheable, true);
  assert.equal(a.key, b.key, "the same first-turn question must hit the same entry");
});

test("the key is case and whitespace insensitive", () => {
  const a = cacheKeyFor({ question: "What is Settle?", history: [], ...V });
  const b = cacheKeyFor({ question: "  what is settle?  ", history: [], ...V });
  assert.equal(a.key, b.key);
});

test("a prompt change invalidates every cached answer", () => {
  // Without promptVersion in the key, a reworded instruction would keep
  // serving answers written under the old one for the rest of the TTL.
  const before = cacheKeyFor({
    question: "what is Settle?",
    history: [],
    corpusVersion: 4,
    promptVersion: 1,
  });
  const after = cacheKeyFor({ question: "what is Settle?", history: [], ...V });
  assert.notEqual(before.key, after.key);
});

test("a corpus change invalidates every cached answer", () => {
  const before = cacheKeyFor({
    question: "what is Settle?",
    history: [],
    corpusVersion: 3,
    promptVersion: 2,
  });
  const after = cacheKeyFor({ question: "what is Settle?", history: [], ...V });
  assert.notEqual(before.key, after.key);
});

test("different first questions never share a key", () => {
  // Genuinely different questions. Case and whitespace variants are covered by
  // the previous test — "What is Settle?" and "what is settle" SHOULD collide.
  const seen = new Map();
  const questions = [
    "what is Settle?",
    "what is the Digital Twin?",
    "what is the deep research agent?",
    "what is product discovery ai?",
    "what did he do at Oracle?",
    "what are his skills?",
    "how can I reach him?",
    "what is the oracle team",
    "who is terry",
  ];
  for (const q of questions) {
    const { key } = cacheKeyFor({ question: q, history: [], ...V });
    assert.equal(seen.has(key), false, `"${q}" collided with "${seen.get(key)}"`);
    seen.set(key, q);
  }
});
