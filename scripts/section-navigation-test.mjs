import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createMemoryHistory } from "@tanstack/history";

const output = join(mkdtempSync(join(tmpdir(), "section-navigation-")), "navigation.mjs");
execFileSync(
  "node_modules/.bin/esbuild",
  [
    "src/lib/section-navigation.ts",
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${output}`,
  ],
  { stdio: "pipe" },
);
const { installSectionNavigation } = await import(pathToFileURL(output).href);

class ElementStub {
  constructor(id = "", attributes = {}) {
    this.id = id;
    this.attributes = new Map(Object.entries(attributes));
    this.listeners = new Map();
    this.focusCount = 0;
    this.target = attributes.target ?? "";
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  closest() {
    return this;
  }
  querySelector() {
    return this.heading ?? null;
  }
  getBoundingClientRect() {
    return { top: 500, height: 80 };
  }
  focus(options) {
    this.focusCount++;
    this.focusOptions = options;
  }
  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }
  removeEventListener(name) {
    this.listeners.delete(name);
  }
}
globalThis.Element = ElementStub;

function setup({ initial = "/", reduce = false, rejected = false, deferred = false } = {}) {
  const history = createMemoryHistory({ initialEntries: [initial] });
  const targets = new Map(
    ["top", "about", "experience", "contact"].map((id) => {
      const section = new ElementStub(id);
      section.heading = new ElementStub(`${id}-heading`);
      return [id, section];
    }),
  );
  const listeners = new Map();
  const frames = new Map();
  const scrolls = [];
  const completions = [];
  let nextFrame = 0;
  let selections = 0;
  const document = {
    getElementById: (id) => targets.get(id) ?? null,
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
  };
  const window = {
    scrollY: 100,
    matchMedia: () => ({ matches: reduce }),
    requestAnimationFrame: (callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    scrollTo: (options) => scrolls.push(options),
  };
  const dispose = installSectionNavigation({
    window,
    document,
    header: new ElementStub(),
    getHash: () => history.location.hash,
    navigate: (hash) => {
      if (rejected) return Promise.reject(new Error("Navigation failed"));
      const destination = `/#${hash}`;
      if (history.location.href !== destination) history.push(destination);
      if (deferred) return new Promise((resolve) => completions.push(resolve));
      return Promise.resolve();
    },
    subscribe: (listener) => history.subscribe(() => listener(history.location.hash)),
    onSelect: () => selections++,
  });
  const flush = async () => {
    await Promise.resolve();
    for (const [id, callback] of [...frames]) {
      frames.delete(id);
      callback();
    }
  };
  const click = (href, overrides = {}, attributes = {}) => {
    const event = {
      target: new ElementStub("", { href, ...attributes }),
      defaultPrevented: false,
      button: 0,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...overrides,
    };
    listeners.get("click")?.(event);
    return event;
  };
  return {
    history,
    targets,
    scrolls,
    dispose,
    flush,
    click,
    frames,
    completions,
    listeners,
    selections: () => selections,
  };
}

test("section selection creates useful Back and Forward destinations with reading focus", async () => {
  const page = setup();
  assert.equal(page.click("#about").defaultPrevented, true);
  await page.flush();
  assert.equal(page.history.location.hash, "#about");
  assert.equal(page.targets.get("about").heading.focusCount, 1);
  assert.deepEqual(page.targets.get("about").heading.focusOptions, { preventScroll: true });
  assert.deepEqual(page.scrolls.at(-1), { top: 504, behavior: "smooth" });
  page.click("#contact");
  await page.flush();
  page.history.back();
  await page.flush();
  assert.equal(page.history.location.hash, "#about");
  assert.equal(page.targets.get("about").heading.focusCount, 2);
  assert.equal(page.scrolls.at(-1).behavior, "auto");
  page.history.forward();
  await page.flush();
  assert.equal(page.history.location.hash, "#contact");
  assert.equal(page.targets.get("contact").heading.focusCount, 2);
  page.dispose();
});

test("direct fragments focus below the measured header without smooth movement", async () => {
  const page = setup({ initial: "/#experience" });
  await page.flush();
  assert.equal(page.targets.get("experience").heading.focusCount, 1);
  assert.deepEqual(page.scrolls, [{ top: 504, behavior: "auto" }]);
  page.dispose();
});

test("same-section selection restores reading focus without adding a history entry", async () => {
  const page = setup({ initial: "/#about" });
  await page.flush();
  page.click("#about");
  await page.flush();
  assert.equal(page.history.length, 1);
  assert.equal(page.targets.get("about").heading.focusCount, 2);
  assert.equal(page.selections(), 1);
  page.dispose();
});

test("reduced motion removes smooth movement for section selection", async () => {
  const page = setup({ reduce: true });
  page.click("#contact");
  await page.flush();
  assert.equal(page.scrolls.at(-1).behavior, "auto");
  page.dispose();
});

test("skip links, modified clicks, missing fragments and external targets remain native", async () => {
  const page = setup();
  for (const [href, flags, attributes] of [
    ["#about", {}, { "data-skip-link": "" }],
    ["#about", { metaKey: true }, {}],
    ["#about", { ctrlKey: true }, {}],
    ["#about", { button: 1 }, {}],
    ["#about", { defaultPrevented: true }, {}],
    ["#missing", {}, {}],
    ["#%invalid", {}, {}],
    ["#about", {}, { target: "_blank" }],
    ["#about", {}, { download: "" }],
  ]) {
    const event = page.click(href, flags, attributes);
    assert.equal(event.defaultPrevented, flags.defaultPrevented ?? false);
  }
  await page.flush();
  assert.equal(page.selections(), 0);
  assert.equal(page.history.length, 1);
  assert.equal(page.scrolls.length, 0);
  page.dispose();
});

test("returning to the plain homepage reaches the opening; initial plain loading leaves router restoration alone", async () => {
  const page = setup();
  await page.flush();
  assert.equal(page.scrolls.length, 0);
  page.click("#contact");
  await page.flush();
  page.history.back();
  await page.flush();
  assert.equal(page.targets.get("top").heading.focusCount, 1);
  page.dispose();
});

test("cleanup cancels pending focus and removes temporary tabindex values", async () => {
  const page = setup();
  page.click("#about");
  await page.flush();
  const heading = page.targets.get("about").heading;
  assert.equal(heading.getAttribute("tabindex"), "-1");
  heading.listeners.get("blur")();
  assert.equal(heading.hasAttribute("tabindex"), false);
  page.click("#contact");
  page.dispose();
  await page.flush();
  assert.equal(page.targets.get("contact").heading.focusCount, 0);
  assert.equal(page.frames.size, 0);
  assert.equal(page.listeners.size, 0);
});

test("failed navigation returns focus to the current section without changing history", async () => {
  const page = setup({ initial: "/#about", rejected: true });
  await page.flush();
  page.click("#contact");
  await page.flush();
  assert.equal(page.history.location.hash, "#about");
  assert.equal(page.targets.get("about").heading.focusCount, 2);
  page.dispose();
});

test("router observation does not replace native skip-target focus", async () => {
  const page = setup();
  const main = new ElementStub("main", { "data-skip-target": "" });
  main.heading = new ElementStub("main-heading");
  page.targets.set("main", main);
  page.history.push("/#main");
  await page.flush();
  assert.equal(main.heading.focusCount, 0);
  assert.equal(page.scrolls.length, 0);
  page.dispose();
});

test("rapid section selection leaves focus on the latest destination", async () => {
  const page = setup();
  page.click("#about");
  page.click("#contact");
  await page.flush();
  assert.equal(page.targets.get("about").heading.focusCount, 0);
  assert.equal(page.targets.get("contact").heading.focusCount, 1);
  assert.equal(page.history.location.hash, "#contact");
  page.dispose();
});

test("authored tabindex values survive navigation and cleanup", async () => {
  const page = setup();
  const heading = page.targets.get("about").heading;
  heading.setAttribute("tabindex", "0");
  page.click("#about");
  await page.flush();
  page.dispose();
  assert.equal(heading.getAttribute("tabindex"), "0");
});

test("an earlier navigation completion cannot take focus from a later selection", async () => {
  const page = setup({ deferred: true });
  page.click("#about");
  page.click("#contact");
  page.completions[1]();
  await page.flush();
  page.completions[0]();
  await page.flush();
  assert.equal(page.targets.get("about").heading.focusCount, 0);
  assert.equal(page.targets.get("contact").heading.focusCount, 1);
  assert.equal(page.history.location.hash, "#contact");
  page.dispose();
});
