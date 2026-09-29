// RAG evaluation harness.
//
// Scores the live chatbot against evals/golden.json. It calls the real
// /api/chat endpoint rather than a local copy, so what it measures is exactly
// what a visitor gets.
//
// Why this exists: five of the eleven defects in how-this-works.md returned
// "ok": true while returning nothing useful. A suite that measures retrieval
// directly turns those into a score of zero, which is impossible to miss.
//
// Run:  npm run eval
//       npm run eval -- --url https://terrymathew.com

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argUrl = process.argv.indexOf("--url");
const BASE = argUrl > -1 ? process.argv[argUrl + 1] : "https://terrymathew.com";
const ENDPOINT = `${BASE.replace(/\/$/, "")}/api/chat`;

const spec = JSON.parse(readFileSync(join(root, "evals", "golden.json"), "utf8"));

/** POSTs one turn and returns the assembled answer, sources, and metadata. */
async function ask(q, history = []) {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q, history }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let sources = [];
  let meta = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let d;
      try {
        d = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (d.type === "delta") text += d.text;
      else if (d.type === "sources") sources = d.sources ?? [];
      else if (d.type === "done") meta = d;
    }
  }

  return { text, sources, meta, ms: Date.now() - started };
}

const has = (text, needle) => text.toLowerCase().includes(needle.toLowerCase());

function scoreCase(c, result) {
  const problems = [];

  if (!result.text.trim()) {
    return { pass: false, problems: ["empty answer"] };
  }

  // `requires` is ANY-match: a case listing ["money", "debt", "clar"] passes if
  // the answer contains one of them. Requiring all of them would fail correct
  // answers that simply use different words, which is the model behaving
  // correctly and the test being wrong.
  const needs = c.requires ?? [];
  if (needs.length && !needs.some((n) => has(result.text, n))) {
    problems.push(`none of [${needs.join(", ")}] present`);
  }

  // `forbids` is ALL-match on absence: any one of these fails the case.
  for (const ban of c.forbids ?? []) {
    if (has(result.text, ban)) problems.push(`forbidden "${ban}" present`);
  }

  if (result.meta?.retrievalMode === "static") {
    problems.push("DEGRADED: static fallback, not vector retrieval");
  }

  return { pass: problems.length === 0, problems };
}

const results = [];

for (const c of spec.cases) {
  let result;
  try {
    result = await ask(c.question);
  } catch (e) {
    results.push({ ...c, pass: false, problems: [`request failed: ${e.message}`], ms: 0 });
    continue;
  }
  const { pass, problems } = scoreCase(c, result);
  results.push({ ...c, pass, problems, text: result.text, ms: result.ms, sources: result.sources });
}

for (const c of spec.multiTurn ?? []) {
  let result;
  try {
    const first = await ask(c.seed);
    result = await ask(c.followup, [
      { role: "user", text: c.seed },
      { role: "bot", text: first.text },
    ]);
  } catch (e) {
    results.push({ ...c, pass: false, problems: [`request failed: ${e.message}`], ms: 0 });
    continue;
  }
  const { pass, problems } = scoreCase(c, result);
  results.push({ ...c, pass, problems, text: result.text, ms: result.ms, sources: result.sources });
}

// ---- report ----
const C = { r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };
const passed = results.filter((r) => r.pass).length;
const retrieval = results.filter((r) => r.category === "retrieval");
const behaviour = results.filter((r) => r.category === "behaviour");
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b.ms, 0) / xs.length) : 0);

console.log(`\n${C.b}RAG evaluation${C.x}  ${C.d}${ENDPOINT}${C.x}\n`);

for (const r of results) {
  const mark = r.pass ? `${C.g}PASS${C.x}` : `${C.r}FAIL${C.x}`;
  const q = r.question ?? r.followup ?? "";
  console.log(
    `${mark}  ${r.id.padEnd(22)} ${String(r.ms).padStart(5)}ms  ${C.d}${q.slice(0, 46)}${C.x}`,
  );
  if (!r.pass) {
    for (const p of r.problems) console.log(`        ${C.y}└─ ${p}${C.x}`);
    if (r.text) console.log(`        ${C.d}got: ${r.text.slice(0, 110)}${C.x}`);
  }
}

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "n/a");
console.log(
  `\n${C.b}Total${C.x}     ${passed}/${results.length}  ${passed === results.length ? C.g : C.r}(${pct(passed, results.length)})${C.x}`,
);
console.log(
  `${C.b}Retrieval${C.x} ${passed && retrieval.filter((r) => r.pass).length}/${retrieval.length}`,
);
console.log(`${C.b}Behaviour${C.x} ${behaviour.filter((r) => r.pass).length}/${behaviour.length}`);
console.log(
  `${C.b}Latency${C.x}   avg ${avg(results)}ms   slowest ${Math.max(0, ...results.map((r) => r.ms))}ms`,
);

const degraded = results.filter((r) => r.problems.some((p) => p.startsWith("DEGRADED")));
if (degraded.length) {
  console.log(
    `\n${C.r}${degraded.length} case(s) fell back to static retrieval. The vector index is probably empty.${C.x}`,
  );
}

process.exit(passed === results.length ? 0 : 1);
