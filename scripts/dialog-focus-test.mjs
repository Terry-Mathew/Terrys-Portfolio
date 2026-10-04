import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const output = join(mkdtempSync(join(tmpdir(), "dialog-focus-")), "focus.mjs");
execFileSync(
  "node_modules/.bin/esbuild",
  ["src/lib/dialog-focus.ts", "--bundle", "--format=esm", "--platform=node", `--outfile=${output}`],
  { stdio: "pipe" },
);
const { dialogFocusTargets, wrapDialogFocus } = await import(pathToFileURL(output).href);
globalThis.getComputedStyle = (element) => ({ visibility: element.visibility ?? "visible" });
const control = (name, options = {}) => ({
  name,
  ...options,
  matches() {
    return this.disabled === true || this.negativeTab === true;
  },
  closest() {
    return this.hiddenAncestor ? {} : null;
  },
  getClientRects() {
    return this.closed ? [] : [{}];
  },
  focus() {
    this.focused = true;
  },
});
const panel = (controls) => ({ querySelectorAll: () => controls });
const tab = (shiftKey = false) => ({
  key: "Tab",
  shiftKey,
  prevented: false,
  preventDefault() {
    this.prevented = true;
  },
});

test("closed source links, disabled controls, and inert descendants leave the focus order", () => {
  const close = control("close");
  const summary = control("sources");
  assert.deepEqual(
    dialogFocusTargets(
      panel([
        close,
        control("source link", { closed: true }),
        summary,
        control("send", { disabled: true }),
        control("inert child", { hiddenAncestor: true }),
        control("hidden", { visibility: "hidden" }),
        control("programmatic target", { negativeTab: true }),
      ]),
    ),
    [close, summary],
  );
});
test("forward Tab on the last visible control wraps past closed source content", () => {
  const first = control("close");
  const last = control("composer");
  const event = tab();
  wrapDialogFocus(panel([first, last, control("closed source", { closed: true })]), event, last);
  assert.equal(first.focused, true);
  assert.equal(event.prevented, true);
});
test("touch opening with focus on the panel moves forward to the first control", () => {
  const first = control("close");
  const event = tab();
  const root = panel([first, control("composer")]);
  wrapDialogFocus(root, event, root);
  assert.equal(first.focused, true);
});
test("Shift Tab from the panel moves to the final visible control", () => {
  const last = control("composer");
  const event = tab(true);
  const root = panel([control("close"), last]);
  wrapDialogFocus(root, event, root);
  assert.equal(last.focused, true);
});
test("opening source details restores its link to the next focus query", () => {
  const source = control("source", { closed: true });
  const root = panel([control("summary"), source]);
  assert.equal(dialogFocusTargets(root).length, 1);
  source.closed = false;
  assert.equal(dialogFocusTargets(root).length, 2);
});
test("ordinary navigation between controls and non-Tab keys remain native", () => {
  const first = control("close");
  const second = control("composer");
  const root = panel([first, second]);
  const event = tab();
  wrapDialogFocus(root, event, first);
  assert.equal(event.prevented, false);
  const other = { ...tab(), key: "Enter" };
  wrapDialogFocus(root, other, second);
  assert.equal(other.prevented, false);
});
test("a dialog with no focus targets does not intercept Tab", () => {
  const event = tab();
  wrapDialogFocus(panel([]), event, null);
  assert.equal(event.prevented, false);
});
