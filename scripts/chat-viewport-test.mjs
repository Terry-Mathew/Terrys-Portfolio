import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const output = join(mkdtempSync(join(tmpdir(), "chat-viewport-")), "viewport.mjs");
execFileSync(
  "node_modules/.bin/esbuild",
  [
    "src/lib/chat-viewport.ts",
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${output}`,
  ],
  { stdio: "pipe" },
);
const { chatViewportGeometry, observeChatViewport } = await import(pathToFileURL(output).href);

test("full phone viewport adds no keyboard inset", () => {
  assert.deepEqual(chatViewportGeometry(800, 800, 0), { height: 800, bottomInset: 0 });
});
test("keyboard overlay reserves the obscured lower area", () => {
  assert.deepEqual(chatViewportGeometry(800, 460, 0), { height: 460, bottomInset: 340 });
});
test("viewport panning counts the visible top offset", () => {
  assert.deepEqual(chatViewportGeometry(800, 460, 80), { height: 460, bottomInset: 260 });
});
test("browser resizing the layout avoids counting keyboard space twice", () => {
  assert.deepEqual(chatViewportGeometry(460, 460, 0), { height: 460, bottomInset: 0 });
});
test("oversized viewport measurements never create negative insets", () => {
  assert.deepEqual(chatViewportGeometry(460, 800, 0), { height: 460, bottomInset: 0 });
});
test("browsers without VisualViewport retain CSS fallback geometry", () => {
  const root = {
    style: {
      setProperty() {
        throw Error("Unexpected mutation");
      },
    },
  };
  observeChatViewport(root, {})();
});
test("viewport updates share one frame and cleanup removes listeners and offsets", () => {
  const values = new Map();
  const events = new Map();
  const viewportEvents = new Map();
  const frames = new Map();
  let sequence = 0;
  const root = {
    style: { setProperty: (k, v) => values.set(k, v), removeProperty: (k) => values.delete(k) },
  };
  const target = {
    innerHeight: 800,
    addEventListener: (k, fn) => events.set(k, fn),
    removeEventListener: (k) => events.delete(k),
    requestAnimationFrame: (fn) => {
      frames.set(++sequence, fn);
      return sequence;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    visualViewport: {
      height: 460,
      offsetTop: 0,
      addEventListener: (k, fn) => viewportEvents.set(k, fn),
      removeEventListener: (k) => viewportEvents.delete(k),
    },
  };
  const cleanup = observeChatViewport(root, target);
  assert.equal(values.get("--chat-keyboard-inset"), "340px");
  viewportEvents.get("resize")();
  viewportEvents.get("scroll")();
  assert.equal(frames.size, 1);
  target.visualViewport.height = 800;
  const run = [...frames.values()][0];
  frames.clear();
  run();
  assert.equal(values.get("--chat-keyboard-inset"), "0px");
  events.get("resize")();
  cleanup();
  assert.equal(frames.size, 0);
  assert.equal(values.size, 0);
  assert.equal(events.size, 0);
  assert.equal(viewportEvents.size, 0);
});
