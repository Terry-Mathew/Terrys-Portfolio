# Chat control repair — 2026-10-04

## Result

Both source findings from the visitor follow-up audit are repaired.
New chat is disabled while generation runs.
The reset handler also checks busy state and the active request controller.
An active answer keeps its conversation until generation ends.
The Stop control remains available during generation.

Enter keeps native newline behavior when the primary pointer is coarse, as on touch devices.
Desktop Enter still sends. Shift+Enter still inserts a new line.
Composition confirmation does not send a message.
The composer hint follows the primary input mode and updates when that mode changes.
A touch device with a fine primary pointer follows the desktop policy.

## Files

- `src/components/site/ChatWidget.tsx`
- `src/lib/chat-controls.ts`
- `src/lib/motion-hooks.ts`
- `scripts/chat-controls-test.mjs`
- `package.json`

## Checks

Seven new tests pass against the shipped control helpers.
The full suite has 283 passes, 0 failures, and 3 credential-dependent skips.
Lint, TypeScript, production build, and diff checks pass.
The built preview image check passes for 6 routes and 44 image assets.

Preview: http://localhost:4192/

## Limits

Real phone keyboard behavior and browser interaction remain unverified.
The tests establish the input policy and reset guard, not rendered operation.
The live website has not changed.
No commit, push, or deploy was performed.
