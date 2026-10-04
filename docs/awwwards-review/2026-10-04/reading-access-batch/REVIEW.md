# Reading and access batch — 2026-10-04

This batch implements 5 code increments on `feat/awwwards-design`.

1. Reveal focused content immediately. Add a focus-within CSS override for reveal groups. Mark React Reveal groups as shown when focus enters. This prevents scroll entrances from hiding a focused link.
2. Replace the experience hover-only note with a native disclosure. Use a named summary with a 44px minimum touch target. Keep the original private story boundary.
3. Add project categories and years to homepage cards. Keep each project status visible. Increase the All projects link touch target.
4. Add direct role and project email actions to the shared project footer. Preserve the existing header contact route. Both actions have matching email subjects.
5. Add case study print styles. Hide navigation and contact chrome. Show reveal content. Use white paper and black text. Remove decorative textures. Limit image height. Apply heading and paragraph page-break rules.

## Files

- `src/components/site/Reveal.tsx`
- `src/components/site/Experience.tsx`
- `src/components/site/Experiments.tsx`
- `src/components/site/ProjectNavigation.tsx`
- `src/routes/projects.$projectId.tsx`
- `src/styles.css`

## Checks

Lint, TypeScript, production build, and diff checks pass.
The full existing suite has 276 passing tests. Three credential-dependent tests remain skipped.
Eight built routes return the expected status. Each route contains 1 main landmark.
The homepage contains the native disclosure markup.
Project routes contain both contact subjects.
Case studies contain print scope and navigation exclusion attributes.
The compiled stylesheet contains print rules and focus-within visibility rules.
See `http-checks.json` for results.

Preview: http://localhost:4187/

## Limits

Browser inventory returned no browser control surfaces during this batch.
No visual baseline capture was possible.
Keyboard focus behavior needs browser confirmation.
Native disclosure operation needs keyboard and touch confirmation.
Print rules need print preview and PDF page inspection.
These markup checks do not close the accessibility, device, or submission gates.
No commit, push, deploy, or award submission was performed.
