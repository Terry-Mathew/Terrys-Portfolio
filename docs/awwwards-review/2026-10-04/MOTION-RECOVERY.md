# Step 07B — Motion recovery

Date: 2026-10-04. Branch: `feat/awwwards-design`.

## Result

The head script now supplies recovery without the client bundle.
The timer removes `html.js` after 5000 ms.
The timer also sets `data-motion-failed`.
Successful root startup cancels the timer through a document event.
The static flag remains after late startup.
Failed GSAP setup requests static content immediately.
Failed reveal observation shows the affected block.

## Evidence

Before the change, the shipped bootstrap leaves the gate active in a script model.
The model has no recovery timer.
After the change, 5 bootstrap model tests pass.
These cover absent JavaScript, blocked startup, successful startup, late startup, and immediate failure.
The lifecycle suite has 11 passing adapter tests.
Three new tests cover partial setup failure, later setup suppression, and observer failure.
The full suite reports 262 passes, 0 failures, and 3 skips.
The pipeline skips require `INGEST_KEY`.
Lint and TypeScript checks pass.
The production build passes with Node 22.
The local Worker returns HTTP 200.
The response contains the recovery event, deadline, and failure flag.
Compiled CSS contains the recovery selector.
See `increment-07b/http-check.json`.

## Files

- `src/lib/motion-recovery.ts` shares the bootstrap and recovery helpers.
- `src/routes/__root.tsx` starts the timer and reports successful startup.
- `src/styles.css` restores 4 reveal groups and the portrait mask.
- `src/lib/useGsapContext.ts` handles setup failures.
- `src/components/site/Reveal.tsx` handles observer failures.
- `scripts/motion-recovery-test.mjs` exercises the shipped bootstrap.
- `scripts/motion-lifecycle-test.mjs` exercises shipped components with controlled adapters.
- `package.json` includes both suites.

## Limits

These checks do not use a browser or the real animation engine.
Blocked-script browser captures remain pending.
Interrupted-loading browser checks remain pending.
Normal loading needs a browser check for flash or movement.
The 5000 ms deadline is a project choice.
The change does not establish award readiness.
No commit or deploy occurs.
