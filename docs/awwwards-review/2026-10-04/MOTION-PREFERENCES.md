# Motion preferences — Step 07A — 2026-10-04

## Result

The GSAP context reads `prefers-reduced-motion` before plugin registration or animation construction.
The context listens for preference changes without waiting for React preference state.
A preference change reverts the old context before another context starts.
Cleanup removes the preference listener and reverts the current context.

Media hooks use React's external store snapshot API.
The server snapshot does not read the browser.
The reduced-motion server snapshot is conservative.
The client snapshot reads the current media query result.

The Hero uses a separate responsive media context for parallax and pointer effects.
Desktop setup uses desktop travel on the first setup.
Breakpoint changes replace responsive effects without replaying the entrance.
A reduced-motion page entry counts as existing visible content.
Enabling motion later leaves the Hero entrance content visible.
The change preserves the current timing and travel values.
The existing CSS reduced-motion visibility rules remain unchanged.

## Checks

The 8 focused tests import the shipped hooks and Hero setup.
The tests use controlled React lifecycle, browser media, and animation adapters.
The tests cover initial reduced motion, current snapshots, preference changes, breakpoint changes, and cleanup decisions.
The tests also cover entrance replay prevention and touch pointer exclusion.
The tests do not run mounted React in a real browser.
The tests do not use the real GSAP animation engine.

Lint, TypeScript, and the Node 22 production build pass.
The full suite records 254 passing tests.
The suite records 0 failures.
The suite skips 3 ingestion checks because `INGEST_KEY` is absent.

## Evidence

- Hooks: `src/lib/motion-hooks.ts`.
- Context: `src/lib/useGsapContext.ts`.
- Hero: `src/components/site/Hero.tsx`.
- Tests: `scripts/motion-lifecycle-test.mjs`.
- Focused test log: `/tmp/terry-awwwards-increment07a-tests.log`.
- Full suite log: `/tmp/terry-awwwards-increment07a-suite.log`.
- Lint log: `/tmp/terry-awwwards-increment07a-lint.log`.
- TypeScript log: `/tmp/terry-awwwards-increment07a-types.log`.
- Build log: `/tmp/terry-awwwards-increment07a-build.log`.
- Production preview: `http://localhost:4179`.

## Limits

First-load motion, preference changes, resize, and route cleanup require browser confirmation.
Lifecycle tests do not prove actual visibility, animation quality, or absence of flicker.
The earlier layout and navigation browser checks remain pending.
No change is committed or deployed.
The website is not ready for an award submission.
