import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["src/lib/chat-controls.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { shouldSendOnEnter, resetChatIfIdle } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const enter = { key: "Enter", shiftKey: false, isComposing: false };
test("desktop Enter sends", () => assert.equal(shouldSendOnEnter(enter, false), true));
test("touch Enter preserves the native newline", () =>
  assert.equal(shouldSendOnEnter(enter, true), false));
test("Shift Enter preserves the newline", () =>
  assert.equal(shouldSendOnEnter({ ...enter, shiftKey: true }, false), false));
test("composition confirmation never sends", () =>
  assert.equal(shouldSendOnEnter({ ...enter, isComposing: true }, false), false));
test("other keys never send", () =>
  assert.equal(shouldSendOnEnter({ ...enter, key: "a" }, false), false));
test("active generation cannot clear its conversation", () => {
  const messages = ["question", "partial answer"];
  assert.equal(
    resetChatIfIdle(true, () => messages.splice(0)),
    false,
  );
  assert.deepEqual(messages, ["question", "partial answer"]);
});
test("idle conversation can reset", () => {
  const messages = ["completed answer"];
  assert.equal(
    resetChatIfIdle(false, () => messages.splice(0)),
    true,
  );
  assert.deepEqual(messages, []);
});
