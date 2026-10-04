# Project browsing and contact batch — 2026-10-04

This batch implements 5 code increments on `feat/awwwards-design`.
Existing branch changes remain intact.

1. Add separate contact actions for role discussions and project discussions. Each email link has a matching subject. Keep the direct email address. Increase social link touch targets.
2. Show a clear case study action on every archive row. The previous arrow container used `hidden` without a display override. Add a named filter group and minimum 44px filter height.
3. Add bordered adjacent project cards. Include each project subtitle so visitors can choose the next story. Name the navigation landmark.
4. Match workflow arrows to the grid. Stacked stages show downward arrows. Wide screens show arrows to the right. Keep the final outward arrow. Increase the source link touch target.
5. Include concept images and workflows in case study navigation when those sections exist. Make each target focusable. Add scroll spacing to each target.

## Files

- `src/components/site/Contact.tsx`
- `src/routes/projects.index.tsx`
- `src/routes/projects.$projectId.tsx`
- `src/components/site/ProjectEvidence.tsx`

## Checks

Lint, TypeScript, and production build pass.
The existing test suite has 276 passing tests. Three credential-dependent tests remain skipped.
Eight built routes return the expected status. Each route has 1 main landmark.
The homepage includes both email subjects.
The archive includes 4 visible case study action labels in the response markup.
Each local case study anchor points to an existing target.
The workflow markup includes both arrow directions with responsive visibility classes.
See `http-checks.json` for results.

Preview: http://localhost:4186/

## Limits

These checks inspect built markup. They do not establish browser appearance.
Phone, keyboard, screen reader, and email application checks remain open.
The visual baseline was not repeated because browser control was unavailable.
No new behavior library or interaction prototype was added.
No award readiness claim follows from these checks.
No commit, push, deploy, or award submission was performed.
