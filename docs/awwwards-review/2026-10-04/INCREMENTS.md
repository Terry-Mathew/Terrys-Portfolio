# Layout increments — 2026-10-04

## Result

Increment 04 separates artwork from project text.
Increment 05 gives the experience photo a positive minimum height.
Both increments pass lint, TypeScript, and the Node 22 production build.
Both increments still require browser checks before completion.

## Increment 04

The cards use normal text flow below a clipped 4:3 artwork area.
The grid uses 1, 2, or 3 columns according to width.
Image slot sizes follow the grid and its maximum container width.
The change adds no dependency or artwork asset.
The existing project action labels remain in place.

The `increment-04/` folder contains 4 screenshots with accessibility records.
The requested widths are 375px, 768px, 1024px, and 1440px.
The browser uses local production preview port 4175.
The `card-checks.json` file records the browser geometry measurements.
All measured cards contain their content and action.
No page-level horizontal overflow appears.
The narrowest console run reports 374px, despite the responsive control requesting 375px.

One 1024px image-boundary measurement reports false.
The measurement uses the transformed image rectangle.
The parent wrapper clips the hover transform.
The 1440px wrapper-based recheck passes in `increment-04/wrapper-checks.json`.
Other wrapper widths remain pending.
Attempts to change width do not produce new console results.
The recheck record does not claim those widths pass.
The original record remains unchanged.

Text zoom remains pending.
Safari focus changes interrupt repeated attempts to complete browser control.
These captures do not prove Chrome, Firefox, or real phone behavior.

## Increment 05

The print height uses `clamp()` with a 12rem minimum.
The sticky utility applies at widths of at least 64rem and heights of at least 48rem.
Short desktop screens use normal page flow.
All viewport calculations remain in `src/styles.css`.

The `increment-05/css-sizing.json` file records formula evaluation at a 16px root size.
The production stylesheet contains both clamps and the sticky media rule.
At a 600px viewport height, the formula changes the image height from 72px to 192px.
The formula remains positive at the recorded heights from 400px to 1080px.
This record checks generated CSS. This record does not check browser rendering.
Short-screen captures, caption readability, timeline overlap, and text zoom remain pending.

## Increment 06A

The project layout adds a shared header with Home, Projects, and Contact links.
A shared closing contact action follows the child route's main content.
The child route openings remove duplicate back links.
The detail routes retain previous and next project links.
The homepage menu breakpoint changes from 768px to 1024px.
The menu resize rule matches the new breakpoint.
The project header uses normal flow with wrapping links and 44px minimum link height.

Lint, TypeScript, and the Node 22 production build pass.
`increment-06a/route-checks.json` records local production HTTP checks at port 4177.
The archive and all 4 project routes return HTTP 200.
The unknown-project route returns HTTP 404.
Each checked route contains 1 main landmark and 1 shared project navigation landmark.
Each checked route contains both contact actions.
The homepage contains the contact destination.

These checks inspect server HTML. These checks do not prove client interaction or visual layout.
Client navigation, Back, keyboard, mobile layout, and text zoom remain pending.
Safari focus changes during a check. A test line enters another chat.
Browser control stops after this error. Chrome control returns a timeout.

## Validation logs

- Increment 04: `/tmp/terry-awwwards-increment04-build.log`.
- Increment 05 lint: `/tmp/terry-awwwards-increment05-lint.log`.
- Increment 05 TypeScript: `/tmp/terry-awwwards-increment05-types.log`.
- Increment 05 build: `/tmp/terry-awwwards-increment05-build.log`.
- Increment 06A lint: `/tmp/terry-awwwards-increment06a-lint.log`.
- Increment 06A TypeScript: `/tmp/terry-awwwards-increment06a-types.log`.
- Increment 06A build: `/tmp/terry-awwwards-increment06a-build.log`.

## Limits

No change is committed or deployed.
The website is not ready for an award submission.
Project proof, route navigation, motion recovery, access checks, and measured mobile performance remain open.

## Increment 07B

Startup recovery uses a 5000 ms deadline.
Setup errors show static content immediately.
The motion suites have 16 passes. Browser confirmation remains pending.
See `MOTION-RECOVERY.md` for evidence and limits.
