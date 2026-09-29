// Guard tests for the lead-capture path.
//
//   npm run test:notify
//
// These cover the failures the notification layer exists to prevent. A unit
// test is the only place they can be checked: in production "the model invented
// an email" is indistinguishable from a real lead until the phone rings.
//
// The functions are transpiled from src/server/ on the fly and imported, so
// this tests the shipped implementation rather than a copy of it.

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const esbuild = join(root, "node_modules/.bin/esbuild");
const outDir = mkdtempSync(join(tmpdir(), "notify-"));

let guard;
let tools;

before(() => {
  // Stubs so chat-tools loads without dragging in the Worker bindings and
  // config. sendPush returns false, so no test can ever fire a real push.
  writeFileSync(
    join(outDir, "config-stub.mjs"),
    `export const CHAT_CONFIG = { notifications: { minNotesLength: 20, maxContactsPerIpPerHour: 1, maxUnknownPerIpPerHour: 3 } };`,
  );
  writeFileSync(
    join(outDir, "push-stub.mjs"),
    `export async function sendPush() { return false; }`,
  );

  const build = (entry, name) => {
    const out = join(outDir, name);
    execFileSync(
      esbuild,
      [
        join(root, "src/server", entry),
        "--bundle",
        "--format=esm",
        "--platform=neutral",
        `--outfile=${out}`,
        `--alias:@/server/chat.config=${join(outDir, "config-stub.mjs")}`,
        `--alias:@/server/pushover=${join(outDir, "push-stub.mjs")}`,
        `--alias:@/server/env=${join(outDir, "env-stub.mjs")}`,
      ],
      { stdio: "pipe" },
    );
    return out;
  };
  writeFileSync(join(outDir, "env-stub.mjs"), "export {};");

  guard = null;
  tools = null;
  globalThis.__notifyPaths = {
    guard: build("email-guard.ts", "email-guard.mjs"),
    tools: build("chat-tools.ts", "chat-tools.mjs"),
  };
});

test("modules transpile and load", async () => {
  const paths = globalThis.__notifyPaths;
  guard = await import(pathToFileURL(paths.guard).href);
  tools = await import(pathToFileURL(paths.tools).href);
  assert.equal(typeof guard.validateContactEmail, "function");
  assert.equal(typeof tools.runToolCall, "function");
});

const corpus = (content) => guard.buildUserCorpus([{ role: "user", content }]);

test("accepts an address the visitor actually typed", () => {
  const c = corpus("reach me at jane.doe@realcompany.co.uk");
  assert.equal(guard.validateContactEmail("jane.doe@realcompany.co.uk", c).ok, true);
});

test("case-insensitive, whitespace and trailing punctuation tolerated", () => {
  const c = corpus("email: Jane.Doe@RealCompany.co.uk,");
  assert.equal(guard.validateContactEmail("  jane.doe@realcompany.co.uk. ", c).ok, true);
});

test("rejects an address the visitor never typed", () => {
  const c = corpus("what did he do at Oracle");
  const r = guard.validateContactEmail("j.smith@northwind.io", c);
  assert.equal(r.ok, false);
  assert.match(r.reason, /not provided by the visitor/);
});

test("rejects a plausible but fabricated address", () => {
  // The documented failure: a realistic address invented for a visitor who
  // gave none.
  assert.equal(
    guard.validateContactEmail("j.smith@northwind.io", corpus("tell me about yourself")).ok,
    false,
  );
});

test("rejects placeholder domains", () => {
  const c = corpus("example.com mailinator.com foo@bar.com");
  for (const bad of [
    "terrystartup@example.com",
    "a@mailinator.com",
    "x@yoursite.com",
    "q@company.com",
    "z@tempmail.dev",
  ]) {
    const r = guard.validateContactEmail(bad, c);
    assert.equal(r.ok, false, `${bad} must be rejected (got: ${JSON.stringify(r)})`);
  }
});

test("rejects an address that only appears inside a URL", () => {
  // The substring hole. Exact-token matching is what closes it.
  const c = corpus("see https://example.org/profile?user=a@b.co for details");
  const r = guard.validateContactEmail("a@b.co", c);
  assert.equal(r.ok, false);
  assert.match(r.reason, /not provided by the visitor/);
});

test("accepts the same address when typed as its own token", () => {
  assert.equal(guard.validateContactEmail("a@b.co", corpus("my email is a@b.co thanks")).ok, true);
});

test("the corpus never includes the system prompt, assistant turns or RAG context", () => {
  // The RAG-specific hazard: contact.md holds Terry's own address, so a corpus
  // built from all message content would let the model submit Terry's email as
  // the visitor's contact and push a notification on every chat.
  const c = guard.buildUserCorpus([
    { role: "system", content: "Contact terry.perangat@gmail.com for anything enterprise." },
    { role: "user", content: "hi there" },
    { role: "assistant", content: "You can reach Terry at terry.perangat@gmail.com" },
    { role: "user", content: "what does he do" },
  ]);
  assert.equal(c.includes("terry.perangat@gmail.com"), false);
  assert.equal(guard.validateContactEmail("terry.perangat@gmail.com", c).ok, false);
});

test("rejects malformed and non-string input", () => {
  const c = corpus("a@b.co");
  for (const bad of ["", "not-an-email", "a@b", "@b.co", "a b@c.co", 42, null, undefined, {}]) {
    assert.equal(guard.validateContactEmail(bad, c).ok, false, `${String(bad)} must be rejected`);
  }
});

test("recovers a tool call that arrived as fenced JSON text", () => {
  const call = tools.parseToolCallFromText(
    'Sure.\n```json\n{"name":"record_user_details","arguments":{"email":"a@b.co","name":"A","notes":"n"}}\n```',
  );
  assert.equal(call?.name, "record_user_details");
  assert.equal(call?.args.email, "a@b.co");
});

test("recovers a tool call that arrived as bare JSON", () => {
  const call = tools.parseToolCallFromText(
    '{"name":"record_unknown_question","arguments":{"question":"q"}}',
  );
  assert.equal(call?.name, "record_unknown_question");
});

test("ignores text that is not a tool call", () => {
  for (const junk of [
    "",
    "hello",
    "no json here",
    "{not json}",
    '```json\n{"name":"rm_rf","arguments":{}}\n```',
  ]) {
    assert.equal(tools.parseToolCallFromText(junk), null, `${junk} must not parse`);
  }
});

test("rejected contacts never push, and return a tool error the model can act on", async () => {
  const messages = [{ role: "user", content: "I want to talk about a role" }];
  const call = {
    id: "1",
    name: "record_user_details",
    args: { email: "invented@northwind.io", name: "X", notes: "a".repeat(30) },
  };
  const { output, pushed } = await tools.runToolCall(call, messages, undefined, "1.2.3.4");
  assert.equal(pushed, false);
  assert.equal(output.success, false);
  assert.match(String(output.error), /Do not invent an address/);
});

test("a short note is rejected — the model fires the tool too eagerly otherwise", async () => {
  const c = "hi, jane@realco.io";
  const call = {
    id: "1",
    name: "record_user_details",
    args: { email: "jane@realco.io", name: "Jane", notes: "hi" },
  };
  const { output, pushed } = await tools.runToolCall(
    call,
    [{ role: "user", content: c }],
    undefined,
    "1.2.3.4",
  );
  assert.equal(pushed, false);
  assert.equal(output.success, false);
  assert.match(String(output.error), /at least 20 characters/);
});

test("a missing name is rejected", async () => {
  const call = {
    id: "1",
    name: "record_user_details",
    args: { email: "jane@realco.io", name: "", notes: "x".repeat(40) },
  };
  const { output } = await tools.runToolCall(
    call,
    [{ role: "user", content: "jane@realco.io" }],
    undefined,
    "1.2.3.4",
  );
  assert.equal(output.success, false);
  assert.match(String(output.error), /name/i);
});

test("unknown tools are refused, not executed", async () => {
  const { output } = await tools.runToolCall(
    { id: "1", name: "drop_database", args: {} },
    [{ role: "user", content: "hi" }],
    undefined,
    "1.2.3.4",
  );
  assert.equal(output.success, false);
  assert.match(String(output.error), /Unknown tool/);
});
