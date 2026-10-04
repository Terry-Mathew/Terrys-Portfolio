import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Exercise shipped hooks and Hero setup with controlled lifecycle/media adapters.
// These tests do not run React in a browser or measure animation frames.
const folder = mkdtempSync(join(tmpdir(), "motion-lifecycle-"));
const reactStub = join(folder, "react.mjs");
const gsapStub = join(folder, "gsap.mjs");
writeFileSync(
  reactStub,
  `
export const hooks = { layouts: [], effects: [], refs: [], unsubscribe: [], updates: [], server: false };
export const useRef = value => { const ref = { current: value }; hooks.refs.push(ref); return ref; };
export const useLayoutEffect = callback => hooks.layouts.push(callback);
export const useEffect = callback => hooks.effects.push(callback);
export const useCallback = callback => callback;
export const useState = value => [value, update => hooks.updates.push(update)];
export const useSyncExternalStore = (subscribe, read, serverRead) => {
  if (hooks.server) return serverRead();
  hooks.unsubscribe.push(subscribe(() => {}));
  return read();
};
`,
);
writeFileSync(
  join(folder, "jsx.mjs"),
  "export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;",
);
writeFileSync(
  gsapStub,
  `
let active;
export const engine = { contexts: [], media: [], timelines: [], sets: [], registered: 0, refreshes: 0 };
function context(callback) {
  const parent = active;
  const self = { children: [], cleanups: [], reverted: false,
    add(callback) { const cleanup = callback(); if (typeof cleanup === 'function') this.cleanups.push(cleanup); },
    revert() { this.reverted = true; this.children.forEach(child => child.revert()); this.cleanups.forEach(fn => fn()); }
  };
  engine.contexts.push(self);
  active = self;
  try { callback(self); } finally { active = parent; }
  return self;
}
export const gsap = {
  registerPlugin() { engine.registered++; }, context,
  set(target, vars) { engine.sets.push({ target, vars }); }, quickSetter() { return () => {}; },
  timeline(vars) {
    const timeline = { vars, tweens: [], reverted: false,
      fromTo(target, from, to) { this.tweens.push({ target, from, to }); return this; },
      revert() { this.reverted = true; }
    };
    engine.timelines.push(timeline); active?.children.push(timeline); return timeline;
  },
  matchMedia() {
    const media = { current: undefined, run: undefined,
      add(queries, callback) {
        this.run = () => {
          this.current?.revert();
          this.current = context(self => {
            self.conditions = Object.fromEntries(Object.entries(queries).map(([name, query]) => [name, window.matchMedia(query).matches]));
            callback(self);
          });
        };
        this.run(); return this;
      },
      revert() { this.current?.revert(); }
    };
    engine.media.push(media); active?.children.push(media); return media;
  }
};
`,
);
writeFileSync(
  join(folder, "scroll.mjs"),
  `import { engine } from './gsap.mjs'; export const ScrollTrigger = { refresh() { engine.refreshes++; } };`,
);
writeFileSync(
  join(folder, "entry.mjs"),
  `
export { useGsapContext } from ${JSON.stringify(resolve("src/lib/useGsapContext.ts"))};
export { usePrefersReducedMotion, useIsDesktop } from ${JSON.stringify(resolve("src/lib/motion-hooks.ts"))};
export { Hero } from ${JSON.stringify(resolve("src/components/site/Hero.tsx"))};
export { Reveal } from ${JSON.stringify(resolve("src/components/site/Reveal.tsx"))};
export { hooks } from './react.mjs'; export { engine } from './gsap.mjs';
`,
);
const bundle = join(folder, "bundle.mjs");
execFileSync(
  "node_modules/.bin/esbuild",
  [
    join(folder, "entry.mjs"),
    "--bundle",
    "--format=esm",
    "--platform=node",
    "--jsx=automatic",
    `--outfile=${bundle}`,
    `--alias:react=${reactStub}`,
    `--alias:react/jsx-runtime=${join(folder, "jsx.mjs")}`,
    `--alias:gsap=${gsapStub}`,
    `--alias:gsap/ScrollTrigger=${join(folder, "scroll.mjs")}`,
    `--alias:@=${resolve("src")}`,
    ...["png", "jpg", "avif", "webp"].map((extension) => `--loader:.${extension}=dataurl`),
  ],
  { stdio: "pipe" },
);
const { useGsapContext, usePrefersReducedMotion, useIsDesktop, Hero, Reveal, hooks, engine } =
  await import(pathToFileURL(bundle).href);

class ElementStub {
  attributes = new Map();
  classList = { remove() {} };
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  children = new Map();
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new ElementStub());
    return this.children.get(selector);
  }
  querySelectorAll() {
    return [...this.children.values()];
  }
}
globalThis.HTMLElement = ElementStub;
function setup({ reduced = false, desktop = true, hover = true } = {}) {
  hooks.layouts.length = hooks.effects.length = hooks.refs.length = hooks.unsubscribe.length = 0;
  hooks.updates.length = 0;
  hooks.server = false;
  engine.contexts.length = engine.media.length = engine.timelines.length = engine.sets.length = 0;
  const queries = new Map();
  const events = new Map();
  const section = new ElementStub();
  globalThis.document = { getElementById: () => section, documentElement: new ElementStub() };
  globalThis.window = {
    matchMedia(query) {
      if (!queries.has(query)) {
        const matches = query.includes("reduced-motion")
          ? reduced
          : query.includes("min-width")
            ? desktop
            : query.includes("width <")
              ? !desktop
              : query.includes("max-width")
                ? !desktop
                : hover;
        const listeners = new Set();
        queries.set(query, {
          matches,
          listeners,
          addEventListener(name, callback) {
            listeners.add(callback);
          },
          removeEventListener(name, callback) {
            listeners.delete(callback);
          },
          change(value) {
            this.matches = value;
            for (const callback of listeners) callback();
          },
        });
      }
      return queries.get(query);
    },
    addEventListener(name, callback) {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(callback);
    },
    removeEventListener(name, callback) {
      events.get(name)?.delete(callback);
    },
  };
  return {
    section,
    queries,
    events,
    mount() {
      for (const ref of hooks.refs) if (ref.current === null) ref.current = section;
      const cleanup = hooks.layouts.map((callback) => callback()).filter(Boolean);
      hooks.effects.forEach((callback) => callback());
      return () => {
        cleanup.forEach((callback) => callback());
        hooks.unsubscribe.forEach((callback) => callback());
      };
    },
    resize(value, pointer = hover) {
      window.matchMedia("(min-width: 1024px)").matches = value;
      window.matchMedia("(width < 1024px)").matches = !value;
      window.matchMedia("(hover: hover)").matches = pointer;
      engine.media.at(-1).run();
    },
  };
}
const intros = () => engine.timelines.filter((timeline) => !timeline.vars.scrollTrigger);
const parallax = () =>
  engine.timelines.filter((timeline) => timeline.vars.scrollTrigger && !timeline.reverted);

test("initial reduced motion prevents setup, plugin work, and layout refresh", () => {
  const page = setup({ reduced: true });
  const registered = engine.registered;
  const refreshes = engine.refreshes;
  let setups = 0;
  useGsapContext(() => setups++);
  const dispose = page.mount();
  assert.equal(setups, 0);
  assert.equal(engine.contexts.length, 0);
  assert.equal(engine.registered, registered);
  assert.equal(engine.refreshes, refreshes);
  dispose();
  assert.equal(page.queries.get("(prefers-reduced-motion: reduce)").listeners.size, 0);
});

test("preference changes revert the old context before creating another context", () => {
  const page = setup();
  let setups = 0;
  useGsapContext(() => setups++);
  const dispose = page.mount();
  const first = engine.contexts[0];
  page.queries.get("(prefers-reduced-motion: reduce)").change(true);
  assert.equal(first.reverted, true);
  assert.equal(setups, 1);
  page.queries.get("(prefers-reduced-motion: reduce)").change(false);
  assert.equal(setups, 2);
  const last = engine.contexts.at(-1);
  dispose();
  assert.equal(last.reverted, true);
  assert.equal(page.queries.get("(prefers-reduced-motion: reduce)").listeners.size, 0);
});

test("server snapshots avoid reading browser state; client snapshots read current values", () => {
  const page = setup({ reduced: true, desktop: true });
  hooks.server = true;
  assert.equal(usePrefersReducedMotion(), true);
  assert.equal(useIsDesktop(), false);
  assert.equal(page.queries.size, 0);
  hooks.server = false;
  assert.equal(usePrefersReducedMotion(), true);
  assert.equal(useIsDesktop(), true);
  hooks.unsubscribe.forEach((callback) => callback());
  assert.equal(
    [...page.queries.values()].every((media) => media.listeners.size === 0),
    true,
  );
});

test("the first desktop setup uses desktop travel without a mobile entrance pass", () => {
  const page = setup();
  Hero();
  const dispose = page.mount();
  assert.equal(intros().length, 1);
  assert.equal(parallax().length, 1);
  const portrait = parallax()[0].tweens.find((tween) => tween.to.y === -30);
  assert.ok(portrait);
  assert.equal(page.events.get("pointermove").size, 1);
  dispose();
  assert.equal(page.events.get("pointermove").size, 0);
});

test("breakpoint changes replace responsive work without restarting the entrance", () => {
  const page = setup();
  Hero();
  const dispose = page.mount();
  page.resize(false);
  assert.equal(intros().length, 1);
  assert.equal(parallax().length, 1);
  assert.equal(page.events.get("pointermove").size, 0);
  page.resize(true);
  assert.equal(intros().length, 1);
  assert.equal(parallax().length, 1);
  assert.equal(page.events.get("pointermove").size, 1);
  dispose();
  assert.equal(parallax().length, 0);
  assert.equal(page.events.get("pointermove").size, 0);
});

test("initial reduced motion stays visible when movement is later enabled", () => {
  const page = setup({ reduced: true });
  Hero();
  const dispose = page.mount();
  assert.equal(engine.timelines.length, 0);
  page.queries.get("(prefers-reduced-motion: reduce)").change(false);
  assert.equal(intros().length, 0);
  assert.equal(parallax().length, 1);
  assert.ok(engine.sets.some((entry) => entry.vars.opacity === 1));
  dispose();
});

test("motion preference changes do not replay an entrance already started", () => {
  const page = setup();
  Hero();
  const dispose = page.mount();
  page.queries.get("(prefers-reduced-motion: reduce)").change(true);
  assert.equal(parallax().length, 0);
  assert.equal(page.events.get("pointermove").size, 0);
  page.queries.get("(prefers-reduced-motion: reduce)").change(false);
  assert.equal(intros().length, 1);
  assert.equal(parallax().length, 1);
  assert.ok(engine.sets.some((entry) => entry.vars.opacity === 1));
  dispose();
});

test("touch desktop does not attach pointer movement", () => {
  const page = setup({ hover: false });
  Hero();
  const dispose = page.mount();
  assert.equal(page.events.get("pointermove")?.size ?? 0, 0);
  assert.equal(parallax().length, 1);
  dispose();
});

test("failed animation setup reverts partial work and requests static content", () => {
  const page = setup();
  const refreshes = engine.refreshes;
  useGsapContext(() => {
    throw new Error("Interrupted setup");
  });
  const original = console.error;
  let dispose;
  try {
    console.error = () => {};
    dispose = page.mount();
  } finally {
    console.error = original;
  }
  assert.equal(document.documentElement.hasAttribute("data-motion-failed"), true);
  assert.equal(engine.contexts[0].reverted, true);
  assert.equal(engine.refreshes, refreshes);
  dispose();
});

test("a recovered page does not create later motion contexts", () => {
  const page = setup();
  document.documentElement.setAttribute("data-motion-failed", "");
  let setups = 0;
  useGsapContext(() => setups++);
  const dispose = page.mount();
  assert.equal(setups, 0);
  assert.equal(engine.contexts.length, 0);
  dispose();
});

test("failed reveal observation leaves the block shown", () => {
  const page = setup();
  const originalObserver = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = class {
    constructor() {
      throw new Error("Observer unavailable");
    }
  };
  const original = console.error;
  let dispose;
  try {
    console.error = () => {};
    Reveal({ children: "Readable content" });
    dispose = page.mount();
  } finally {
    console.error = original;
    globalThis.IntersectionObserver = originalObserver;
  }
  assert.equal(hooks.updates.at(-1), true);
  dispose();
});
