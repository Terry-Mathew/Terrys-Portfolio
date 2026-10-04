import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

const output = join(mkdtempSync(join(tmpdir(), "motion-recovery-")), "recovery.mjs");
execFileSync(
  "node_modules/.bin/esbuild",
  [
    "src/lib/motion-recovery.ts",
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${output}`,
  ],
  { stdio: "pipe" },
);
const { MOTION_BOOTSTRAP, MOTION_BOOT_TIMEOUT_MS, markMotionReady, revealMotionFallback } =
  await import(pathToFileURL(output).href);

function page() {
  const classes = new Set();
  const attributes = new Map();
  const listeners = new Map();
  const timers = new Map();
  let clock = 0;
  let nextTimer = 0;
  const root = {
    classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) },
    setAttribute: (name, value) => attributes.set(name, value),
  };
  const document = {
    documentElement: root,
    addEventListener(name, callback, options) {
      listeners.set(name, { callback, once: options?.once });
    },
    dispatchEvent(event) {
      const listener = listeners.get(event.type);
      if (!listener) return;
      if (listener.once) listeners.delete(event.type);
      listener.callback();
    },
  };
  const context = {
    document,
    setTimeout(callback, delay) {
      timers.set(++nextTimer, { callback, deadline: clock + delay });
      return nextTimer;
    },
    clearTimeout: (timer) => timers.delete(timer),
  };
  return {
    root,
    document,
    classes,
    attributes,
    timers,
    start() {
      runInNewContext(MOTION_BOOTSTRAP, context);
    },
    advance(time) {
      clock += time;
      for (const [timer, entry] of [...timers])
        if (entry.deadline <= clock) {
          timers.delete(timer);
          entry.callback();
        }
    },
  };
}

test("no JavaScript leaves the hidden-content gate absent", () => {
  const model = page();
  model.advance(MOTION_BOOT_TIMEOUT_MS * 2);
  assert.equal(model.classes.has("js"), false);
  assert.equal(model.timers.size, 0);
});

test("blocked client scripts remove the gate at the recovery deadline", () => {
  const model = page();
  model.start();
  assert.equal(model.classes.has("js"), true);
  model.advance(MOTION_BOOT_TIMEOUT_MS - 1);
  assert.equal(model.attributes.has("data-motion-failed"), false);
  model.advance(1);
  assert.equal(model.attributes.has("data-motion-failed"), true);
  assert.equal(model.classes.has("js"), false);
});

test("successful client startup keeps normal reveals after cancelling recovery", () => {
  const model = page();
  model.start();
  markMotionReady(model.document);
  assert.equal(model.timers.size, 0);
  model.advance(MOTION_BOOT_TIMEOUT_MS * 2);
  assert.equal(model.attributes.has("data-motion-failed"), false);
  assert.equal(model.classes.has("js"), true);
});

test("late client startup cannot hide recovered content again", () => {
  const model = page();
  model.start();
  model.advance(MOTION_BOOT_TIMEOUT_MS);
  markMotionReady(model.document);
  assert.equal(model.attributes.has("data-motion-failed"), true);
  assert.equal(model.classes.has("js"), false);
});

test("local animation failure requests the same static presentation immediately", () => {
  const model = page();
  model.start();
  revealMotionFallback(model.root);
  assert.equal(model.attributes.has("data-motion-failed"), true);
  assert.equal(model.classes.has("js"), false);
});
