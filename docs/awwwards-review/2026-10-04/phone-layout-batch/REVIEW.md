# Phone layout batch — 2026-10-04

This batch implements 5 code increments on `feat/awwwards-design`.

1. Adjust the Hero for phone widths. Use smaller name text, tighter spacing, and a portrait height limit.
2. Adjust navigation for narrow screens. Allow the name to shrink. Add safe-area padding to the phone menu.
3. Adjust project cards. Reduce phone padding and text size. Allow long text to wrap.
4. Adjust case studies. Reduce phone spacing and body text size. Allow headings and evidence text to wrap.
5. Adjust chat for the phone keyboard. Use the visible viewport height. Move chat above the covered area.

## Code

- Hero: `src/components/site/Hero.tsx`, `src/styles.css`.
- Navigation: `src/components/site/Nav.tsx`, `src/styles.css`.
- Cards: `src/components/site/Experiments.tsx`.
- Case studies: `src/routes/projects.$projectId.tsx`, `src/components/site/ProjectEvidence.tsx`.
- Chat: `src/components/site/ChatWidget.tsx`, `src/lib/chat-viewport.ts`, `src/styles.css`.
- Chat checks: `scripts/chat-viewport-test.mjs`, `package.json`.

## Checks

Lint, TypeScript, production build, and diff checks pass.
The full test suite has 276 passing tests. Three credential-dependent tests remain skipped.
Seven new tests check viewport calculations, event updates, and cleanup.
Eight built routes return the expected status. Each route has 1 main landmark.
Missing routes return 404 with noindex metadata.
The compiled CSS contains the new phone layout rules.
See `http-checks.json` for route results.

Preview: http://localhost:4185/

## Limits

HTTP checks do not prove phone appearance.
Browser control was unavailable during this batch.
Real phone rendering, keyboard behavior, landscape, and zoom checks remain open.
The live website has not changed. No commit, push, or deploy was performed.
These increments do not close the full device review or Awwwards submission gates.
