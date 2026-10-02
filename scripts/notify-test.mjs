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
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const esbuild = join(root, "node_modules/.bin/esbuild");
const outDir = mkdtempSync(join(tmpdir(), "notify-"));

let guard;
let tools;
let chat;

before(() => {
  // Stubs so chat-tools loads without dragging in the Worker bindings and
  // config. sendPush returns false, so no test can ever fire a real push.
  writeFileSync(
    join(outDir, "config-stub.mjs"),
    `export const CHAT_CONFIG = { notifications: { minMessageLength: 20, maxContactsPerIpPerHour: 1, maxUnknownPerIpPerHour: 3 } };`,
  );
  writeFileSync(
    join(outDir, "push-stub.mjs"),
    // Records the push so the payload can be asserted, and reports success the
    // way a working send would. It sends nothing: no test can fire a real
    // notification.
    //
    // The recorder lives on globalThis because esbuild inlines this module into
    // chat-tools.mjs, so the bundled copy and any direct import are two separate
    // module instances with two separate arrays.
    `if (!globalThis.__pushes) globalThis.__pushes = [];
     export async function sendPush(_env, message, opts) { globalThis.__pushes.push({ message, opts }); return true; }`,
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
    guard: build("contact-guard.ts", "contact-guard.mjs"),
    tools: build("chat-tools.ts", "chat-tools.mjs"),
    chat: join(outDir, "chat-promise.mjs"),
  };
});

test("modules transpile and load", async () => {
  const paths = globalThis.__notifyPaths;
  guard = await import(pathToFileURL(paths.guard).href);
  tools = await import(pathToFileURL(paths.tools).href);
  assert.equal(typeof guard.validateContactEmail, "function");
  assert.equal(typeof guard.validateContactPhone, "function");
  assert.equal(typeof tools.runToolCall, "function");
});

// The detector is a pure predicate with no dependencies, so it is lifted out of
// chat.ts rather than bundling the whole server to reach it.
test("the handoff detector is a pure function of the answer", async () => {
  const src = readFileSync(join(root, "src", "server", "chat.ts"), "utf8");
  const to = src.indexOf("export const isChatCancelled");
  const start = src.indexOf("const HANDOFF_CLAIM");
  const end = src.indexOf("export const isChatCancelled");
  // applyHandoffCorrection and the notice live just below the detector.
  assert.ok(start > -1 && end > start, "HANDOFF_CLAIM not found in chat.ts");
  const snippet = src.slice(start, end);
  // Still TypeScript — it carries a parameter type — so it goes through the
  // compiler rather than being written out as JavaScript.
  const { outputText } = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const file = join(outDir, "chat-promise.mjs");
  writeFileSync(file, outputText);
  chat = await import(pathToFileURL(file).href);
  assert.equal(typeof chat.promisesHandoff, "function");
  assert.equal(typeof chat.applyHandoffCorrection, "function");
  assert.equal(typeof chat.HANDOFF_FAILURE_NOTICE, "string");
});

const corpus = (content) => guard.buildUserCorpus([{ role: "user", content }]);

// --- phone -------------------------------------------------------------------
//
// The visitor transcript that prompted this: "Can you ask Terry to call me
// back", then a name, an address and "Do you need my number". The number was
// dropped, because the tool had nowhere to put it.
//
// A guessed number is worse than a missing one — the cost of the error is a
// phone call to a stranger — so the provenance check is the same one the
// address gets, and it is tested just as hard.

test("accepts a number the visitor actually typed", () => {
  const c = corpus("my number is 7022446269");
  assert.equal(guard.validateContactPhone("7022446269", c).ok, true);
});

test("accepts the same number in any of the formats people type", () => {
  // Formatting differences must not cost a lead. Comparing the raw strings
  // would reject a genuine number and train the model to re-ask.
  const c = corpus("call me on +91 70224 46269");
  for (const form of [
    "+91 70224 46269",
    "+91-70224-46269",
    "+917022446269",
    "917022446269",
    "(91) 70224 46269",
  ]) {
    const r = guard.validateContactPhone(form, c);
    assert.equal(r.ok, true, `${form} should match (got: ${JSON.stringify(r)})`);
  }
});

test("rejects a number the visitor never typed", () => {
  // The documented risk: the model completes a plausible number.
  const r = guard.validateContactPhone("+91 98765 43210", corpus("what did he do at Oracle"));
  assert.equal(r.ok, false);
  assert.match(r.reason, /not provided by the visitor/);
});

test("rejects a number invented for a visitor who gave none", () => {
  assert.equal(
    guard.validateContactPhone("+919876543210", corpus("tell me about yourself")).ok,
    false,
  );
});

// --- how models rewrite what people type -------------------------------------
//
// The first version compared digit strings for equality, and every one of these
// was the visitor's own number being refused. A model does not copy a number
// out of a sentence; it normalises it. Refusing the normalisations loses the
// lead, which is the exact failure this guard was written to avoid.

test("a country code the model added is accepted", () => {
  // The visitor gave a local number. The model supplied the country.
  const c = corpus("my number is 7022446269");
  assert.equal(guard.validateContactPhone("+91 7022446269", c).ok, true);
});

test("a trunk zero and a country code still count as the same number", () => {
  // They line up at neither end, only where they agree.
  const c = corpus("07700 900123");
  assert.equal(guard.validateContactPhone("+44 7700 900123", c).ok, true);
});

test("an extension the model dropped is accepted", () => {
  const c = corpus("7022446269 ext 214");
  assert.equal(guard.validateContactPhone("7022446269", c).ok, true);
});

test("grouping the model introduced is accepted", () => {
  const c = corpus("7022446269");
  for (const form of ["(91) 702-244-6269", "+91.702.244.6269", "91 702 244 6269"]) {
    assert.equal(guard.validateContactPhone(form, c).ok, true, form);
  }
});

test("digits the model invented at the end are refused", () => {
  // The asymmetry that keeps this safe: a country code goes at the front, so
  // anything appended at the end is the model making digits up, and Terry dials
  // what it says.
  const c = corpus("7022446269");
  assert.equal(guard.validateContactPhone("7022446269999", c).ok, false);
});

test("a wholly different number is still refused", () => {
  const c = corpus("7022446269");
  for (const bad of ["9876504321", "5551234567", "70224462"]) {
    assert.equal(guard.validateContactPhone(bad, c).ok, false, bad);
  }
});

test("a number sharing only a few digits is refused", () => {
  // Nine digits have to agree. Eight is a coincidence, not an identity.
  const c = corpus("7022446269");
  assert.equal(guard.validateContactPhone("9917022446", c).ok, false);
});

test("phone is optional", () => {
  // Most visitors give an email and nothing else. Rejecting those would throw
  // away the leads that already work.
  for (const value of [undefined, null, "", "   "]) {
    assert.equal(guard.validateContactPhone(value, corpus("hello")).ok, true, String(value));
  }
});

test("rejects placeholder and malformed numbers", () => {
  const c = corpus("my number is 11111 00000 12345 1234567 1234567890");
  for (const bad of [
    "1111100000", // long run of identical digits
    "1234567890", // straight up the keypad
    "0987654321", // straight down the keypad
    "12345", // too short
    "1234567890123456", // longer than E.164 allows
    "+91-abc-12345", // letters
  ]) {
    const r = guard.validateContactPhone(bad, c);
    assert.equal(r.ok, false, `${bad} must be rejected (got: ${JSON.stringify(r)})`);
  }
});

test("a number that only appears inside a longer figure does not count", () => {
  // The substring hole, same as the address path.
  const c = corpus("my order number is 9907022446269887");
  assert.equal(guard.validateContactPhone("7022446269", c).ok, false);
});

test("the phone corpus never includes the system prompt or RAG context", () => {
  // The same hazard as the address: the knowledge base carries Terry's own
  // contact details, and a corpus built from everything would let the model
  // submit his number as the visitor's.
  const c = guard.buildUserCorpus([
    { role: "system", content: "Phone 7022446269 for the office." },
    { role: "user", content: "hi" },
    { role: "assistant", content: "You can call 7022446269" },
  ]);
  assert.equal(guard.validateContactPhone("7022446269", c).ok, false);
});

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

// --- the notification itself -------------------------------------------------
//
// Terry reads this on his phone. If the phone number or the message is missing
// from it, the capture worked and the follow-up does not.

const capture = (args, userText) =>
  tools.runToolCall(
    { id: "1", name: "record_user_details", args },
    [{ role: "user", content: userText }],
    { CACHE: undefined },
    "9.9.9.9",
  );

const lastPush = () => globalThis.__pushes.at(-1);

test("the notification carries the name, address, number and message", async () => {
  const { output, pushed } = await capture(
    {
      email: "tony@iopot.com",
      name: "Tony",
      phone: "+91 70224 46269",
      message: "Wants Terry to call him back about a data product role.",
    },
    "Tony tony@iopot.com, number is +91 70224 46269 — call me back",
  );
  assert.equal(pushed, true, `capture should have sent: ${JSON.stringify(output)}`);

  const body = lastPush().message;
  assert.match(body, /Name: Tony/);
  assert.match(body, /Email: tony@iopot.com/);
  assert.match(body, /Phone: \+91 70224 46269/);
  assert.match(body, /Message: Wants Terry to call him back/);
});

test("a capture with no number says so rather than leaving a blank line", async () => {
  // Most visitors give only an email. Terry needs to know the difference
  // between "no number given" and "the number was dropped".
  const { pushed } = await capture(
    { email: "jane@realco.io", name: "Jane", message: "Asking about a data role in Bengaluru." },
    "hi, jane@realco.io",
  );
  assert.equal(pushed, true);
  assert.match(lastPush().message, /Phone: not given/);
});

test("a message sent on the previous field name is still accepted", async () => {
  // A model trained on the old schema still emits `notes`. Dropping a visitor's
  // message because the field was renamed loses the lead.
  const { pushed } = await capture(
    { email: "jane@realco.io", name: "Jane", notes: "Wants a callback about a data role." },
    "hi, jane@realco.io",
  );
  assert.equal(pushed, true);
  assert.match(lastPush().message, /Message: Wants a callback/);
});

test("an invented number is refused and nothing is sent", async () => {
  const before = globalThis.__pushes.length;
  const { output, pushed } = await capture(
    {
      email: "jane@realco.io",
      name: "Jane",
      phone: "+91 98765 43210",
      message: "Wants Terry to call him back about something.",
    },
    "hi, jane@realco.io",
  );
  assert.equal(pushed, false);
  assert.equal(output.success, false);
  assert.match(String(output.error), /phone/i);
  assert.equal(globalThis.__pushes.length, before, "no notification may be sent");
});

test("a long message is truncated so the notification is not rejected", async () => {
  // Pushover refuses a body over 1024 characters, and a rejected push means the
  // lead is lost entirely rather than shortened.
  const long = "x".repeat(3000);
  const { pushed } = await capture(
    { email: "jane@realco.io", name: "Jane", message: long },
    "hi, jane@realco.io",
  );
  assert.equal(pushed, true);
  assert.ok(lastPush().message.length <= 1024, `body was ${lastPush().message.length} chars`);
});

test("two numbers for one person are two leads, not a duplicate", async () => {
  // The fingerprint includes the number, so a visitor who changes address is
  // not silently swallowed as the same lead.
  const one = await capture(
    { email: "jane@realco.io", name: "Jane", message: "Wants a callback about a data role." },
    "hi, jane@realco.io",
  );
  assert.equal(one.pushed, true);
  globalThis.__pushes.length = 0;
  const two = await capture(
    {
      email: "jane@realco.io",
      name: "Jane",
      phone: "7022446269",
      message: "Wants a callback about a data role.",
    },
    "hi, jane@realco.io, my number is 7022446269",
  );
  assert.equal(two.pushed, true, "a different number is a different lead");
});

// --- a promised handoff with nothing behind it --------------------------------
//
// The first real lead was lost here. The visitor gave a name, a number, a role
// and an address, the chatbot said "Done. Terry will reach out.", and no
// notification ever arrived. The model had written that sentence as ordinary
// text without calling the tool, and nothing in the pipeline checked.

test("the detector recognises the promises the model actually makes", () => {
  const claims = [
    "Done. Terry will reach out.",
    "I'll let Terry know you'd like him to call.",
    "I'll pass that along to Terry.",
    "Terry will get in touch.",
    "I'll forward your details.",
    "I've noted it and Terry will be in touch.",
    "He'll call you back.",
    "Got it — Terry will call you.",
  ];
  for (const answer of claims) {
    assert.equal(chat.promisesHandoff(answer), true, answer);
  }
});

test("the detector does not fire on ordinary answers", () => {
  const plain = [
    "Terry is currently Senior Data Product Manager for Partner Analytics at Oracle.",
    "I'm currently Senior Data Product Manager for Partner Analytics at Oracle.",
    "He led a 20-person EMEA operations team handling 20,000 tickets a quarter.",
    "You can reach him at terry.perangat@gmail.com.",
    "I can't call anyone, but I can pass a message along if you give me an email.",
    "That's outside what this portfolio chatbot covers.",
    "",
  ];
  for (const answer of plain) {
    assert.equal(chat.promisesHandoff(answer), false, answer);
  }
});

test("the detector ignores the answer a capture failure produces", () => {
  // A refusal must not read as a promise. If it did, every guarded rejection
  // would log as a lost lead and bury the real ones.
  for (const answer of [
    "Contact recorded.",
    "Contact noted.",
    "Contact already recorded.",
    "The phone number was rejected. Ask the visitor to type it themselves.",
  ]) {
    assert.equal(chat.promisesHandoff(answer), false, answer);
  }
});

// --- option B: tell the visitor the truth ------------------------------------
//
// The promise was streamed before anyone could know it was false, so it cannot
// be taken back. What can be done is arrive with the correction rather than
// leaving a false claim on screen.

test("a false promise is corrected and the correction says how to reach Terry", () => {
  const out = chat.applyHandoffCorrection("Done. Terry will reach out.", false);
  assert.equal(out.broken, true);
  assert.match(out.text, /^Done\. Terry will reach out\./);
  assert.ok(out.text.includes(chat.HANDOFF_FAILURE_NOTICE));
  assert.match(out.text, /terry\.perangat@gmail\.com/, "a dead end is not a correction");
});

test("a real capture is left exactly as written", () => {
  const answer = "Done. Terry will reach out.";
  const out = chat.applyHandoffCorrection(answer, true);
  assert.equal(out.broken, false);
  assert.equal(out.text, answer, "a working capture must not gain a false apology");
});

test("an answer with no promise is untouched either way", () => {
  const answer = "He led a 20-person EMEA operations team handling 20,000 tickets a quarter.";
  assert.deepEqual(chat.applyHandoffCorrection(answer, true), { text: answer, broken: false });
  assert.deepEqual(chat.applyHandoffCorrection(answer, false), { text: answer, broken: false });
});

test("a guarded refusal is not mistaken for a broken promise", () => {
  // Every rejection returns success:false and a message that says nothing was
  // promised. If any of these counted as broken, the counter would fill with
  // noise and the real failures would be lost in it.
  for (const answer of ["Contact recorded.", "Contact noted.", "Contact already recorded."]) {
    assert.equal(chat.applyHandoffCorrection(answer, false).broken, false, answer);
  }
});

test("the correction keeps the promise it is correcting", () => {
  // Rewriting instead of appending would leave what the visitor already read
  // contradicted by silence, which is the thing this is meant to avoid.
  const promise = "I'll pass that along to Terry.";
  const out = chat.applyHandoffCorrection(promise, false);
  assert.ok(out.text.startsWith(promise), "the original wording must survive");
  assert.ok(out.text.includes(chat.HANDOFF_FAILURE_NOTICE));
});

test("an answer carrying a broken promise is never cached", () => {
  // Caching it would pin a false promise for a day, and the next visitor to ask
  // the same thing would be told it had been passed on too.
  const src = readFileSync(join(root, "src", "server", "chat.ts"), "utf8");
  assert.match(src, /cacheable && !handoffBroken/);
});

test("the per-IP ceiling allows a second visitor but the fingerprint still blocks a repeat", () => {
  const config = readFileSync(join(root, "src", "server", "chat.config.ts"), "utf8");
  const limit = Number(/maxContactsPerIpPerHour:\s*(\d+)/.exec(config)?.[1]);
  assert.ok(limit >= 3, `ceiling is ${limit}; offices put many visitors on one address`);
  // The ceiling is not what stops one visitor repeating themselves.
  const tools = readFileSync(join(root, "src", "server", "chat-tools.ts"), "utf8");
  assert.match(tools, /push:dedup:/, "the 24-hour fingerprint must still exist");
});
