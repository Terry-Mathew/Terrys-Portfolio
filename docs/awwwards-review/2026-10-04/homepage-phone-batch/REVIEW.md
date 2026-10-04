# Remaining homepage phone layouts — 2026-10-04

This batch implements 5 section changes on `feat/awwwards-design`.

1. About: reduce phone section padding, column gaps, paragraph margins, and border indentation. Set phone body text to 16px. Give the project link a 44px minimum touch target.
2. Experience: reduce phone section padding, column gaps, timeline indentation, row gaps, and role heading size. Move timeline markers with the new indentation. Preserve roles and dates.
3. Capabilities: reduce phone padding and column gaps. Let long skill names wrap. Enable sticky positioning only above 1024px width and 768px height.
4. Credentials: stack full-width cards below 640px. Keep the horizontal row above that width. Hide scroll arrows on phones. Reduce card padding. Add expanded state and a valid target to the View all button. Give the focused card row a visible ring.
5. Beyond Work: reduce phone padding, image grid margin, and caption heading size. Give the Instagram link a 44px minimum touch target.

The shared `section-reading-padding` utility uses 56px phone padding per edge.
The utility uses 80px from 640px, then 128px from 768px.
The existing desktop section padding remains 128px.
The shared `reading-sticky` utility prevents pinning on short screens.

## Files

- `src/components/site/About.tsx`
- `src/components/site/Experience.tsx`
- `src/components/site/Capabilities.tsx`
- `src/components/site/Credentials.tsx`
- `src/components/site/OffTheClock.tsx`
- `src/styles.css`

## Checks

Lint, types, production build, and diff checks pass.
The suite has 276 passing tests. Three credential-dependent tests remain skipped.
HTTP checks confirm all 5 sections use the shared padding utility.
The credentials expansion target exists.
The compiled stylesheet contains the new layout and focus rules.
The project image check passes for 6 routes and 44 image assets.
See `layout-checks.json` and `image-checks.json` for results.

Preview: http://localhost:4189/

## Limits

These checks inspect source, built markup, and files.
Phone appearance, horizontal overflow, credential scrolling, and expansion need browser checks.
Screen reader announcements need a separate check.
No visual baseline comparison was possible with the available browser controls.
The live website has not changed.
No commit, push, deploy, or award submission was performed.
The device and submission gates remain open.
