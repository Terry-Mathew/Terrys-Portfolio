# Five design increments — Batch 2

Date: 2026-10-04. Branch: `feat/awwwards-design`.
Preview: http://localhost:4184/

## Changes

| Increment | Plan area | Implemented change |
| --- | --- | --- |
| 1 | 13 keyboard review | Shared focus handling excludes hidden controls, disabled controls, and closed source links. Panel focus wraps to visible controls. |
| 2 | 13 short-screen navigation | Mobile menu scrolls independently. Short screens use smaller links and closer spacing. |
| 3 | 05 and 13 short-screen geometry | Chat height reserves space for the launcher, margin, viewport edge, and bottom safe area. |
| 4 | 14 image transfer preparation | Archive and case study size hints match their actual grid and padding calculations. |
| 5 | 12 support states | Root and project 404 routes share a recovery screen with one main landmark, a descriptive heading, recovery links, and noindex metadata. |

## Files

- `src/lib/dialog-focus.ts` supplies the shared focus policy.
- `src/components/site/ChatWidget.tsx` uses the shared focus policy.
- `src/components/site/Nav.tsx` uses the policy and short-screen menu layout.
- `src/styles.css` reserves viewport space for the chat panel.
- `src/routes/projects.index.tsx` corrects archive image hints.
- `src/routes/projects.$projectId.tsx` corrects case study image hints and uses shared recovery.
- `src/components/site/MissingPage.tsx` supplies the recovery page.
- `src/routes/__root.tsx` uses the recovery page.
- `scripts/dialog-focus-test.mjs` covers focus scenarios with controlled element adapters.
- `package.json` runs the new tests in the full suite.

## Evidence

Seven focus tests pass.
The full suite has 269 passes, 0 failures, and 3 skips.
The pipeline skips need `INGEST_KEY`.
Lint, TypeScript, production build, and whitespace checks pass.
Eight HTTP route checks pass.
Both unknown routes return 404 with one main landmark and noindex metadata.
Known routes do not receive noindex metadata.
Recovery links, image hints, and compiled viewport rules pass response checks.

The geometry model shows the old mobile panel starts 64 px above the viewport without a safe inset.
The new mobile panel starts 40 px below the viewport top for the checked heights.
The model uses a 16 px root size and checked bottom safe insets of 0 and 34 px.
The model does not include the browser keyboard or every possible viewport height.

Image hints now match a 688 px case study slot at a 768 px viewport.
Archive hints match a 206 px slot at a 1024 px viewport and 345 px at the container cap.
These calculations do not prove faster loading.

## Limits

The focus tests use controlled adapters, not a real browser layout engine.
Browser keyboard review, zoom, landscape phone review, and rendered chat geometry remain open.
Visitor comparisons and loading medians remain open.
No deployment, commit, push, or award submission occurs.
Earlier branch work is preserved.
The five increments complete implementation work, not every parent step acceptance gate.
