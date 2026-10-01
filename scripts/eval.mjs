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
// Failures are classified, and the two classes are treated differently
// downstream:
//
//   AVAILABILITY — the chatbot could not answer at all. Nothing passed, a case
//                  was rate limited, or no model tier produced anything. This
//                  blocks a deploy: shipping a chatbot that cannot answer is
//                  worse than not shipping one.
//
//   CONTENT      — the chatbot answered, but the answer missed. This warns.
//                  Retrieval content lags a deploy, models phrase things
//                  differently, and blocking every push on "the word 300 was
//                  missing" trains people to ignore the gate.
//
// Run:  npm run eval
//       npm run eval -- --url https://terrymathew.com
//
// Exit: 0 clean · 1 availability failure · 2 content misses only

import { readFileSync } from "node:fs";
import {
  availability,
  classifyGate,
  content,
  formatGateLine,
  ofKind,
  scoreCase,
} from "./eval-gate.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argUrl = process.argv.indexOf("--url");
const BASE = argUrl > -1 ? process.argv[argUrl + 1] : "https://terrymathew.com";
const ENDPOINT = `${BASE.replace(/\/$/, "")}/api/chat`;

const spec = JSON.parse(readFileSync(join(root, "evals", "golden.json"), "utf8"));

// The chatbot rate-limits per IP. This suite fires ~20 requests from one
// address, so it has to behave like a well-mannered client: one request every
// PACE_MS, comfortably under the server's ceiling. Without this the run trips
// the limiter and every case after the tenth returns "empty answer" — which
// looks exactly like a total system failure and is not one.
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  let warning = null;
  let cancelled = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      // `:hb` heartbeat comments arrive on this stream to keep proxies from
      // closing an idle connection. They are not JSON and carry no data: line,
      // so they are skipped rather than parsed.
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
      else if (d.type === "warning") warning = d.reason ?? "degraded";
      else if (d.type === "cancelled") cancelled = true;
      else if (d.type === "done") {
        meta = d;
        // Rate-limited and extractive responses emit no deltas — the answer
        // only exists on the done event. Without this fallback every such case
        // scored "empty answer", which looks identical to a total outage.
        if (!text) text = d.answer ?? "";
      }
    }
  }

  if (cancelled) throw new Error("stream cancelled before completion");
  return { text, sources, meta, warning, ms: Date.now() - started };
}

const results = [];

// A request that never completed is availability by definition: the chatbot
// did not answer. Kept as a tagged problem rather than a bare string so it
// counts toward the gate like any other availability failure.
const failed = (e) => availability(`request failed: ${e.message}`);

// Let the rate-limit window drain before starting, so a run launched right
// after manual testing is not judged on requests it did not make.
await sleep(5000);

for (const c of spec.cases) {
  await sleep(PACE_MS);
  let result;
  try {
    result = await ask(c.question);
  } catch (e) {
    results.push({ ...c, pass: false, problems: [failed(e)], ms: 0 });
    continue;
  }
  const { pass, problems } = scoreCase(c, result);
  results.push({
    ...c,
    pass,
    problems,
    text: result.text,
    ms: result.ms,
    sources: result.sources,
    warning: result.warning,
  });
}

for (const c of spec.multiTurn ?? []) {
  await sleep(PACE_MS);
  let result;
  try {
    const first = await ask(c.seed);
    await sleep(PACE_MS);
    result = await ask(c.followup, [
      { role: "user", text: c.seed },
      { role: "bot", text: first.text },
    ]);
  } catch (e) {
    results.push({ ...c, pass: false, problems: [failed(e)], ms: 0 });
    continue;
  }
  const { pass, problems } = scoreCase(c, result);
  results.push({
    ...c,
    pass,
    problems,
    text: result.text,
    ms: result.ms,
    sources: result.sources,
    warning: result.warning,
  });
}

// ---- report ----
const C = { r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };

// One decision, computed once, used for the report, the summary line and the
// exit code. Deriving it again in each place is how a run that blocks the
// deploy ends up printing "Advisory" to the operator reading the log.
const gate = classifyGate(results);
const { passed, clean: isClean, availability: isDown } = gate;
const retrieval = results.filter((r) => r.category === "retrieval");
const behaviour = results.filter((r) => r.category === "behaviour");
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b.ms, 0) / xs.length) : 0);

const hasKind = (r, kind) => ofKind([r], kind).length > 0;

console.log(`\n${C.b}RAG evaluation${C.x}  ${C.d}${ENDPOINT}${C.x}\n`);

for (const r of results) {
  const mark = r.pass
    ? `${C.g}PASS${C.x}`
    : hasKind(r, "availability")
      ? `${C.r}DOWN${C.x}`
      : `${C.y}MISS${C.x}`;
  const q = r.question ?? r.followup ?? "";
  console.log(
    `${mark}  ${r.id.padEnd(22)} ${String(r.ms).padStart(5)}ms  ${C.d}${q.slice(0, 46)}${C.x}`,
  );
  if (!r.pass) {
    for (const p of r.problems) {
      const tint = p.kind === "availability" ? C.r : C.y;
      console.log(`        ${tint}└─ [${p.kind}] ${p.text}${C.x}`);
    }
    if (r.text) console.log(`        ${C.d}got: ${r.text.slice(0, 110)}${C.x}`);
  }
}

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "n/a");
console.log(
  `\n${C.b}Total${C.x}     ${passed}/${results.length}  ${isClean ? C.g : C.r}(${pct(passed, results.length)})${C.x}`,
);
console.log(
  `${C.b}Retrieval${C.x} ${passed && retrieval.filter((r) => r.pass).length}/${retrieval.length}`,
);
console.log(`${C.b}Behaviour${C.x} ${behaviour.filter((r) => r.pass).length}/${behaviour.length}`);
console.log(
  `${C.b}Latency${C.x}   avg ${avg(results)}ms   slowest ${Math.max(0, ...results.map((r) => r.ms))}ms`,
);

const degraded = ofKind(results, "content").filter((r) =>
  r.problems.some((p) => p.text.startsWith("DEGRADED")),
);
if (degraded.length) {
  console.log(
    `\n${C.r}${degraded.length} case(s) fell back to static retrieval. The vector index is probably empty.${C.x}`,
  );
}

const warned = results.filter((r) => r.warning);
if (warned.length) {
  console.log(
    `\n${C.y}${warned.length} case(s) came back with a stream warning (${warned[0].warning}).${C.x}`,
  );
}

const throttled = ofKind(results, "availability").filter((r) =>
  r.problems.some((p) => p.text.startsWith("RATE LIMITED")),
);
if (throttled.length) {
  console.log(
    `\n${C.r}${throttled.length} case(s) were rate limited. Raise EVAL_PACE_MS (currently ${PACE_MS}ms).${C.x}`,
  );
}

const extractive = ofKind(results, "availability").filter((r) =>
  r.problems.some((p) => p.text.startsWith("NO MODEL")),
);
if (extractive.length) {
  console.log(
    `\n${C.y}${extractive.length} case(s) were served extractively — no model answered.${C.x}\n` +
      `  ${C.d}Scores on those cases measure retrieval, not generation. Check provider${C.x}\n` +
      `  ${C.d}quota, then re-run for a true reading.${C.x}`,
  );
}

// One line, machine-readable, for the deploy workflow to branch on. Printed on
// stdout alongside the human report so both survive in the same log.
//
// The string is built by formatGateLine, the same function the unit tests
// assert on, so the line the workflow greps cannot drift from the behaviour
// that decides the exit code.
console.log(`\n${C.b}${formatGateLine(gate).replace("GATE", "GATE")}${C.x}`);

if (isDown) {
  console.log(
    `\n${C.r}BLOCKING: the chatbot is not answering — ${gate.availabilityFailures} availability failure(s)` +
      (passed === 0 ? " and nothing passed." : ".") +
      `${C.x}`,
  );
} else if (!isClean) {
  console.log(
    `\n${C.y}Advisory: ${gate.contentFailures} content miss(es). The chatbot answered; the retrieval or the phrasing did not land.${C.x}`,
  );
}

// 1 blocks the deploy, 2 does not. See classifyGate.
process.exit(gate.exitCode);
