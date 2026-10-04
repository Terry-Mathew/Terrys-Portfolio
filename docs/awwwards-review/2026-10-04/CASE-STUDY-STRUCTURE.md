# Step 08B — Digital Twin case study structure

Date: 2026-10-04.

Optional `ProjectEvidence` data supplies a title, summary, stages, decisions, caption, and source link.
The Digital Twin case study renders that data before its text sections.
The component labels the diagram as explanatory prototype material.
The caption states that the diagram is not a product screen.
The evidence note states the measurement limits.
The diagram uses real text in an ordered list. No image is required.
The layout uses one column below the large-screen breakpoint.
Other projects have no evidence data and render their existing case study sections.

Lint, TypeScript, production build, and whitespace checks pass.
A static server rendering check confirms 3 stages and explicit evidence labels.
The check confirms that only Digital Twin has the optional data.
The first rendering harness fails on module URL resolution.
The corrected harness uses file URLs and passes.
These checks do not establish browser appearance or direct route behavior.

Real product screen collection remains open in Step 08A.
Step 08B remains partial until its screen and browser acceptance checks pass.
Digital Twin and Settle card artwork changes remain in Step 08C.
No commit, deploy, or award submission occurs.
