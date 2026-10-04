# Production baseline — 2026-10-04

## Result

The local Worker serves the production build.
The review records 40 route and section captures.
The review records 9 local browser measurements.
The tablet view confirms cramped cards and crowded navigation.

## Build and browser

- Branch: `feat/awwwards-design`.
- Base commit: `cc035e6`.
- Working change: Increment 03 project labels.
- Build: Node 22, `npm run build`.
- Source checks: lint and TypeScript pass.
- Browser: Safari 26.6.2 on macOS 26.6.2.
- Preview: Wrangler 4.147.0, local mode, `http://localhost:4174`.
- Viewports: 375×900, 768×900, 1024×900, 1440×900.
- Pixel ratio: 2x.
- Performance conditions: localhost, normal CPU, normal network, existing browser cache.

Vite preview fails because it expects `dist/server/server.js`.
Nitro creates `.output/server/index.mjs` for the Worker target.
The installed Wrangler 4.86.0 cannot support the configured compatibility date.
The review uses Wrangler 4.147.0 without changing repository dependencies.

## Visual records

The `baseline/` folder contains screenshots and accessibility records.
`baseline/capture-register.json` records each route and viewport.

| View | Route or fragment |
| --- | --- |
| Homepage opening | `/` |
| Project cards | `/#experiments` |
| Experience | `/#experience` |
| Project archive | `/projects` |
| Digital Twin | `/projects/digital-twin` |
| Product Discovery AI | `/projects/product-discovery-ai` |
| Settle | `/projects/settle` |
| Deep Research Agent | `/projects/deep-research-agent` |
| Missing project | `/projects/review-missing-project` |
| Missing page | `/review-missing-page` |

These captures show the route opening or named section.
These captures do not show every position within each page.

## Local browser measurements

The browser measures 3 runs per route at 1440×900.
`baseline/browser-performance.json` records every run.

FCP measures the first visible content.
LCP measures the largest visible content during the observation window.
TTFB measures the time before the browser receives the first response byte.

| Route | Median FCP | Median LCP | Median TTFB |
| --- | --- | --- | --- |
| `/` | 84 ms | 132 ms | 10 ms |
| `/projects` | 48 ms | 79 ms | 7 ms |
| `/projects/digital-twin` | 41 ms | 75 ms | 8 ms |

These results describe a local, unthrottled, cached browser.
These results do not establish mobile network performance or live Core Web Vitals.
Safari does not expose layout-shift observations in this run.
CLS remains unmeasured. Real-user INP remains unmeasured.
The browser reports no page-level horizontal overflow for these 9 measurements.

`baseline/build-assets.json` records the baseline build asset sizes.
Those sizes describe files, not measured network transfers.
Keep existing assets within their baseline sizes during the card repair.
Do not add JavaScript dependencies for that repair.
Set final transfer and font budgets after cold, throttled measurements.

## Interaction checks

The mobile menu opens with focus on its close button.
Escape closes the menu. Focus returns to the menu button.
The chatbot opens with focus on the question field.
Escape closes the chatbot.
The captured immediate focus state after chat closure is a container.
Complete chat focus restoration testing during the accessibility review.
This review sends no chatbot question.

## New defects and pending checks

At 768px, the 3-column project grid gives titles too little room.
The fixed card overlay forces long descriptions into clipped text.
At 768px, desktop navigation crowds the Terry Mathew name.
Repair navigation during Increment 06A.

Cold mobile performance measurements remain pending.
Complete keyboard traversal remains pending.
Real iOS, Android, Firefox, and Chrome checks remain pending.
Root error recovery needs a controlled failure test during Increment 12.
Do not treat the missing-page capture as an error-boundary test.

## Increment split

Increment 02A records the visual baseline required for layout repairs.
Increment 02B records the local performance baseline.
Increment 02B retains the cold mobile and transfer measurement gate.
Layout repairs depend on 02A. Final performance review depends on 02B.
This split permits bounded layout repairs without inventing missing performance results.

This document follows ASD-100 style rules. The official word list was not checked.
