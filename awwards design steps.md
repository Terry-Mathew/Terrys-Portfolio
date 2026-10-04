# Awwwards design steps

## Result

This work is complex. Implement the work in small increments.
Complete each simple repair in one pass. Split motion, navigation, media, and signature interaction work.
The earlier planning turn excluded application changes.
The user now authorizes implementation in separate increments.

**Branch:** `feat/awwwards-design`.
**Starting commit:** `cc035e6`.
**Current plan:** `awaards design plan.md`.
**Historical audit:** `docs/AWWWARDS-AUDIT-2026-10-04.md`.

The source audit confirms the starting branch matches the fetched `origin/main`.
The documents are uncommitted. Preserve those documents during implementation.

## Submission assessment

This sequence can produce a credible Awwwards submission if the finished website passes every required review.
The sequence cannot promise an award. The jury judges the finished experience.
Passing technical checks does not establish strong design or originality.

| Scoring category | Work that supports the category | Required final evidence |
| --- | --- | --- |
| Design — 40% | Distinct project media, clear hierarchy, consistent routes | Finished screens across the device matrix |
| Usability — 30% | Navigation, focus, responsive content, motion safety | Successful keyboard, touch, device, and performance checks |
| Creativity — 20% | One signature interaction tied to Terry’s work | A memorable concept that improves visitor understanding |
| Content — 10% | Real case studies, clear versions, supported results | Complete project evidence and accurate public claims |

The weights come from [Awwwards evaluation](https://www.awwwards.com/about-evaluation/).
Technology supports these categories. Technology is not the fourth main category.

## Working rules

1. Check the branch and working tree before each increment.
2. Declare the files required for that increment.
3. Capture the affected view before changing application code.
4. Implement only that increment.
5. Run the checks required for that increment.
6. Compare the affected view with the original capture.
7. Record the result in this file.
8. Continue only after required checks pass.

Fix failures inside the same increment. Preserve unrelated files.
Do not add behavior tests that merely repeat a small text or CSS change.
Use regression tests for navigation, state, recovery, or animation lifecycle behavior.
Keep unverified checks visibly pending. A source review is not a browser test.

No increment authorizes a commit, push, deploy, ingestion, or award submission by itself.
Use the session’s explicit authorization for those actions.
Do not restore the public resume. The merged removal was intentional.
Keep private assets outside published bundles.

## Increment map

| Increment | Scope | Delivery size | Depends on | Status |
| --- | --- | --- | --- | --- |
| 00 | Re-audit the plan against current source | One pass | None | Complete: source review only |
| 01 | Define audience, visual rules, and review references | One planning pass | 00 | Complete: bounded desktop reference review |
| 02A | Capture the visual baseline | Separate browser pass | 01 | Complete: local production route openings |
| 02B | Record performance and asset baseline | Separate measurement pass | 01 | Local baseline recorded; 18 fresh-context final runs recorded; physical mobile checks remain open |
| 03 | Repair project labels and documentation | One bounded repair | 00 | Complete: verified locally |
| 04 | Repair project card geometry | One bounded layout change | 02A, 03 | Implemented; 48 Chromium layout combinations pass |
| 05 | Repair short-screen print sizing | One bounded CSS change | 02A | Implemented; short-screen layout matrix passes; native text zoom remains open |
| 06A | Define route navigation and closing actions | One structure change | 01, 02A | Implemented; route, menu focus, and closing actions checked locally |
| 06B | Repair section focus and browser history | Separate behavior change | 06A | Implemented; regression checks pass; complete browser history acceptance remains open |
| 07A | Verify motion preference setup | Separate behavior change | 02A | Implemented; lifecycle tests pass; native browser preference check remains open |
| 07B | Add animation failure recovery | Separate recovery change | 07A | Implemented; recovery tests pass; normal browser reveals pass |
| 08A | Gather evidence for the first case study | One content pass | 01 | Source scope complete; owner permits labelled illustration; runtime evidence remains limited |
| 08B | Add the first case study media structure | One rendering change | 08A, 04, 06A | Implemented; case artwork and responsive browser layout pass |
| 08C | Populate the remaining featured project pages | One project at a time | 08B | Implemented; all project images pass; real demos remain limited |
| 09 | Refine homepage order and content hierarchy | One layout change | 08B | Implemented; browser layouts pass; owner reports positive visitor feedback |
| 10A | Prototype the signature interaction | Separate prototype | 01, 07B, 08B | Prototype delivered for review; production retains static story |
| 10B | Test the prototype against the static story | Separate visitor review | 10A | Review package delivered; qualitative owner feedback recorded; controlled comparison not supplied |
| 10C | Integrate the selected signature interaction | Separate production change | 10B | Static production presentation retained; controlled comparative evidence remains open |
| 11 | Refine motion continuity and route changes | One bounded motion pass | 09, 10C | Implemented; normal browser reveals pass; regression checks pass |
| 12 | Complete support states and sharing presentation | Small separate repairs | 08C, 11 | Support states, filters, metadata implemented; HTTP checks pass |
| 13 | Complete accessibility and device review | One defect at a time | 03–12 | 8-route automated scan reports no violations; manual contrast and physical device checks remain open |
| 14 | Measure and repair performance | One measured cause at a time | 02B, 13 | 18 local runs complete; median LCP 200–248 ms; field and throttled device checks remain open |
| 15 | Run final design and submission review | Separate final review | 14 | Local implementation review complete; external submission evidence remains open |

Independent simple repairs can proceed before content collection finishes.
Do not combine code increments merely because the increments have similar dates.

## 00 — Re-audit the plan

**Result:** complete for source review. Application implementation remains pending.

The source review confirms missing Settle sections and repeated project artwork.
The source review confirms fixed card overlays and project route navigation gaps.
The source review adds first-load preferences, focus/history, support states, and route sharing metadata.
The source review corrects the resume finding. The private extraction path is intentional.

Evidence: commit `cc035e6`, fresh remote fetch, and the revised design plan.
Limits: this turn does not repeat live browser checks or obtain performance measurements.

## 01 — Define the design direction

**Purpose:** make one clear design decision before building effects.
**Files:** the design plan and this execution file.

1. Define the main visitor using the website’s current purpose.
2. Define the action that visitor should take.
3. Compare 3 current awarded portfolios from the official gallery.
4. Record each reference’s award label and review date.
5. Record useful principles from the actual rendered websites.
6. Confirm the proposed promise, “From complexity to clarity.”
7. Define typography, color, spacing, image treatment, and motion roles.
8. Define the static alternative for the signature interaction.

Use [the official portfolio gallery](https://www.awwwards.com/websites/portfolio/) for reference discovery.
Do not copy a reference’s layout or assets.
Keep the real portrait, warm paper, dark opening, and restrained orange accent.
The owner selects hiring managers and potential clients on 2026-10-04.
Both groups use the same project evidence.
Provide separate contact actions for role discussions and project discussions.

**Acceptance:** 2 visitor groups, clear contact actions, one visual direction, and one signature idea.
**Review evidence:** a short brand brief and comparison notes.

## 02A / 02B — Record the baseline

**Purpose:** distinguish improvements from regressions.
**Files:** review notes and browser captures. Add measurement tools only when required.

1. Run lint and TypeScript checks on the starting code.
2. Build a local production version without deployment.
3. Capture the homepage, archive, and all project pages.
4. Capture project 404 and root recovery views.
5. Record keyboard navigation and chatbot opening behavior.
6. Run 3 lab performance measurements per selected route.
7. Record the browser, build, device profile, network settings, and test date.
8. Set initial asset budgets from the measured baseline.

Test 375px, 768px, 1024px, and 1440px widths.
Include 320px width, 1024×600, 200% zoom, and landscape phones in the later device review.
Record browser captures at known viewport sizes. Screenshot pixel dimensions alone do not establish viewport width.

**Acceptance:** comparable visual and performance records exist.
**Limits:** if a measurement tool fails, mark that measurement pending.
Do not replace missing measurements with estimated scores.

02A records route openings and the affected section views.
02B records local performance separately from cold mobile performance.
Layout repairs use 02A. The final performance gate retains the pending 02B checks.
The baseline report records controlled error recovery as pending for Increment 12.

## 03 — Repair project labels and source guidance

**Purpose:** make link promises match available content.
**Files:** `src/components/site/Experiments.tsx`, `AGENTS.md`.
Use existing case study data where possible.

1. Use a progress label for a project with no case study sections.
2. Keep complete case study labels for projects with case study content.
3. Update repository resume guidance to the private extraction path.

Do not invent Settle content. Do not restore the removed public PDF.
Treat “full content exists” separately from “link label is accurate.”

**Acceptance:** Settle’s action accurately describes the destination.
AGENTS.md describes `private/Terry-Mathew-CV.pdf` and the existing extraction behavior.
**Checks:** lint, TypeScript, and a browser check of the project actions.
**Recovery:** restore only these label and guidance edits if the change fails review.

## 04 — Repair project card geometry

**Purpose:** keep artwork and content readable across widths.
**Files:** `src/components/site/Experiments.tsx`.
Change `src/styles.css` only if a reusable utility is required.

1. Measure card content at tablet widths.
2. Separate text from the fixed image overlay where the overlay constrains reading.
3. Use the column count that fits the real content.
4. Preserve status and action visibility.
5. Correct responsive image slot sizes after the layout changes.

Keep project descriptions short. Keep essential information outside clipped decoration.
Treat hover as optional feedback. Touch and keyboard visitors must receive the same information.

**Acceptance:** titles, status, and actions remain complete at every test width.
No page-level horizontal overflow appears.
**Checks:** lint, TypeScript, and before/after captures at 375px, 768px, 1024px, and 1440px.
Also check text zoom.

## 05 — Repair short-screen print sizing

**Purpose:** prevent tiny or invalid photo geometry.
**Files:** `src/styles.css`.
Change `src/components/site/Experience.tsx` only if sticky behavior must change.

1. Inspect the print at 1024×600.
2. Give the print a positive lower height bound.
3. Disable sticky behavior where available height cannot fit the column.
4. Verify the caption and timeline remain readable.

Keep viewport calculations inside the CSS utility.
Do not use nested calculations inside arbitrary Tailwind dimensions.

**Acceptance:** print dimensions remain positive on short desktop screens.
No timeline content hides behind the header or photo.
**Checks:** production CSS, short-screen captures, and zoom inspection.

## 06A — Complete project route navigation

**Purpose:** preserve orientation and contact access across routes.
**Files:** `src/routes/projects.tsx`, project route files, and a small shared navigation component if needed.
Include `src/components/site/Nav.tsx` for the crowded tablet navigation breakpoint.
The verified homepage navigation file is `src/components/site/Nav.tsx`.

1. Add a compact project route header with Home and Projects access.
2. Add a clear contact action after the project proof.
3. Preserve previous and next project navigation.
4. Keep one main landmark per page.

Do not reuse homepage fragment links without valid destinations.
Project contact actions must reach `/#contact` or a valid direct contact destination.
Keep the route header readable against its actual surface.

**Acceptance:** every project route provides Home, Projects, and contact access.
The shared header causes no duplicate navigation or hidden content.
**Checks:** direct loading, client navigation, Back, unknown project, keyboard, and mobile layout.

## 06B — Repair focus and fragment history

**Purpose:** make section navigation useful for keyboard visitors and shared links.
**Files:** `src/components/site/Nav.tsx`, `src/lib/section-navigation.ts`,
`scripts/section-navigation-test.mjs`, and `package.json`.
The helper separates router updates from scroll and focus behavior.
The test suite uses simulated page elements with the actual memory history library.
Browser confirmation remains a separate requirement.

1. Preserve fragment URLs when a visitor selects a section.
2. Preserve useful browser Back behavior.
3. Move keyboard focus to the selected section.
4. Restore menu trigger focus after cancellation.
5. Verify direct fragment loading below the fixed header.

Keep the existing skip link behavior intact.
Do not restore trigger focus after a successful section selection if that restoration defeats destination focus.

**Acceptance:** keyboard selection moves reading focus to the destination.
Escape closes the menu without losing focus.
**Checks:** meaningful keyboard and history regression tests, plus browser confirmation.

## 07A — Verify first-load motion preferences

**Purpose:** respect reduced motion before constructing timelines.
**Files:** `src/lib/motion-hooks.ts`, `src/lib/useGsapContext.ts`, and `src/components/site/Hero.tsx`.
Include `scripts/motion-lifecycle-test.mjs` and `package.json` for focused lifecycle checks.

1. Reproduce first loading with reduced motion enabled.
2. Establish the preference before constructing movement timelines.
3. Prevent breakpoint setup from restarting visible entrance animation.
4. Verify cleanup after resizing and route changes.

Preserve readable server rendering. Preserve the static reduced-motion presentation.
Keep timing values in the shared motion module.

**Acceptance:** reduced-motion visitors receive no initial entrance movement.
The desktop entrance completes once per intended page entry.
**Checks:** first-load browser checks, preference changes, breakpoint changes, and lifecycle regression tests.

## 07B — Add animation failure recovery

**Purpose:** keep important content readable after partial client failure.
**Files:** `src/styles.css`, motion setup files, and root shell only where necessary.

1. Test no JavaScript, blocked client scripts, and interrupted loading separately.
2. Add a bounded visibility recovery path for important gated content.
3. Preserve normal reveals when animation setup succeeds.
4. Verify the hero, About, Contact, and generic reveals.

About and Contact already have local setup recovery.
Local recovery cannot run if the client bundle never starts.
Choose the recovery mechanism after the failure test establishes the missing path.

**Acceptance:** the main name, statement, and actions remain readable after failure.
Normal loading introduces no new flash or layout movement.
**Checks:** blocked-script and setup-failure regression tests, plus browser captures.

## 08A — Gather the first case study evidence

**Purpose:** provide real material before building the new layout.
**Files:** `src/content/projects.ts` and a project evidence note.

Start with Digital Twin. Explain whether the page covers the 2025 project or the current portfolio implementation.

1. Confirm the project version and repository.
2. Record Terry’s role, scope, and project status.
3. Collect a real public product screen.
4. Record one problem, one important decision, and one supported result.
5. Record source dates and public-use limits for claims.
6. Explain unsupported or unavailable outcome measurements.

Do not treat model output as proof of implementation.
Do not describe input checks as proof of email ownership.
Use owner input where the available evidence cannot establish a fact.

**Acceptance:** the case study has a coherent version and public evidence.
**Limits:** missing content blocks only the dependent media increment.

## 08B — Add one case study media structure

**Purpose:** show the product inside the website.
**Files:** `src/content/projects.ts`, `src/routes/projects.$projectId.tsx`, and a focused media component.
Add approved assets under `src/assets/`.

1. Add optional typed media data.
2. Render one real product screen near the case study opening.
3. Render a short decision sequence with useful captions.
4. Add responsive images with reserved dimensions.
5. Give informative media useful text alternatives.

Use the existing `Picture` component where suitable.
Keep other projects working when optional media is absent.
Label explanatory illustrations clearly.

**Acceptance:** visitors inspect the first product without leaving the website.
No missing-media block or invalid image request appears on other routes.
**Checks:** lint, TypeScript, production build, direct route loading, and responsive visual inspection.

## 08C — Complete the remaining project pages

**Purpose:** make featured work consistently credible.
**Files:** project content, approved media assets, and project artwork mapping.

1. Populate Product Discovery AI with real output and supported claims.
2. Give Digital Twin distinct project media.
3. Replace the shared card image with a verified Digital Twin screen or diagram.
4. Replace Settle's current card image with a verified Settle screen or product-specific composition.
5. Check both distinct images within the 4:3 card crop.
6. Replace Settle’s empty case study with a truthful progress presentation.
7. Review the nonfeatured Deep Research Agent page for accurate status.
8. Verify the code and demo links for each project.

Complete one project before changing the next project.
Do not manufacture metrics for “weeks to minutes” or other speed claims.
Keep prototype evidence separate from live production evidence.
Use a progress presentation where a complete case study does not exist.

**Acceptance:** each featured project shows distinct evidence or an explicit progress state.
Every public outcome has support or a stated limit.
**Checks:** content evidence review, link verification, and media inspection.

## 09 — Refine homepage hierarchy

**Purpose:** make the promise lead quickly to proof.
**Files:** `src/routes/index.tsx`, `src/components/site/About.tsx`, and selected section copy only.

1. Test Selected Work immediately after the hero.
2. Shorten the About opening without changing career facts.
3. Keep Experience as supporting proof.
4. Reduce repeated headings or labels that add no information.
5. Check the fixed navigation after the section order changes.

Capabilities and Credentials must each have a distinct purpose.
Keep personal photography as a human part of the story.
Do not reorder sections before real project content makes the new sequence useful.

**Acceptance:** visitors identify one product and Terry’s role within the proposed 30-second test.
**Checks:** visitor task, headline-only scan, fragment navigation, and before/after captures.

## 10A — Prototype the signature interaction

**Purpose:** create one original interaction that demonstrates the brand promise.
**Files:** a local prototype component and storyboard note.
Keep unfinished prototypes out of published navigation.

1. Select one real project example with public evidence.
2. Write the problem, structure, and output stages.
3. Define visitor controls and visible state changes.
4. Build a static version with complete information.
5. Build the interactive version using the existing stack.
6. Define equivalent keyboard, touch, and reduced-motion behavior.

Illustrative Digital Twin example: question, matching evidence, then answer with source access.
Use deterministic sample content for the prototype unless real generation improves the task.
Label sample answers as examples. Do not simulate verified live retrieval.

**Acceptance:** the prototype explains a real project decision.
The prototype remains understandable without animation.
**Checks:** local interaction review and an initial asset-cost comparison.

## 10B — Test the signature idea

**Purpose:** decide whether the interaction earns its complexity.
**Files:** visitor review notes and storyboard revisions.

1. Recruit 5 visitors who resemble the chosen audience.
2. Compare the static explanation with the interactive explanation.
3. Ask visitors to describe the project problem and result.
4. Ask visitors to identify Terry’s contribution.
5. Record confusion, task completion, and remembered details.
6. Revise or remove interaction that reduces understanding.

Vary presentation order where practical.
Do not claim statistical significance from 5 visitors.
Record missing visitor input honestly.

**Acceptance:** the interactive version preserves task completion and improves understanding or useful recall.
Use the static version if the interaction does not help.

## 10C — Integrate the selected interaction

**Purpose:** turn the tested idea into a reliable public feature.
**Files:** selected interaction component, approved content, and shared motion rules where required.

1. Integrate the selected version into Selected Work or its case study.
2. Keep the full explanation available without the interaction.
3. Add state feedback for every visitor action.
4. Limit animation work to the visible interaction.
5. Verify cleanup after route changes.

Keep normal scroll behavior. Keep buttons usable during transitions.
Lazy-load costly optional code only when needed.

**Acceptance:** keyboard, touch, reduced-motion, and normal views communicate the same project facts.
The interaction introduces no route failure or trapped focus.
**Checks:** state regression tests, production build, browser checks, and asset comparison.

## 11 — Refine motion continuity

**Purpose:** make motion serve the whole journey.
**Files:** the shared motion module and specifically affected components.

1. Review opening, Selected Work, signature sequence, and closing as one storyboard.
2. Remove reveals that delay useful reading.
3. Align motion timing with the shared rules.
4. Test a short route transition only where continuity improves.
5. Preserve normal navigation when transitions are unsupported.

Do not add smooth-scroll infrastructure merely for award appearance.
Do not add audio, cursor replacement, or a forced opening loader without a concept need.
The plan requires coherence, not a larger effect count.

**Acceptance:** visitors can interrupt motion without losing access to content or controls.
Route changes produce no stale animation or hidden content.
**Checks:** interrupted scroll, repeated navigation, resize, and reduced-motion browser review.

## 12 — Complete support states and sharing

**Purpose:** finish the surfaces visitors can reach outside the main journey.
**Files:** root route, project metadata, archive states, and share assets where required.

1. Match 404 and error states to the editorial visual rules.
2. Keep recovery actions immediately usable.
3. Review archive filtering and its result feedback.
4. Add route-specific canonical and sharing URLs.
5. Add project share images after approved project media exists.
6. Verify sitemap entries against actual public routes.

Split support-state styling from metadata if both require substantial changes.
Do not make sharing polish a blocker before the main project experience works.

**Acceptance:** support states share the identity and offer useful recovery.
Shared links identify the correct route.
**Checks:** unknown routes, metadata inspection, image availability, and filter behavior.

## 13 — Complete accessibility and device review

**Purpose:** verify the finished experience across input methods and devices.
**Files:** review records and only the files responsible for each verified defect.

1. Check every route using keyboard input.
2. Check menu and chatbot focus behavior.
3. Check headings, landmarks, labels, and image alternatives with a screen reader.
4. Measure text and focus contrast on actual rendered surfaces.
5. Check touch targets and landscape phone behavior.
6. Check zoom, text wrapping, and horizontal overflow.
7. Check initial reduced motion and changed preferences.
8. Check Chrome, Safari, Firefox, iOS Safari, and Android Chrome.

Use real devices for final phone checks when available.
Mark device emulation separately from real device evidence.
Fix one verified defect per bounded repair.

**Acceptance:** essential content and actions remain usable across the review matrix.
No unresolved serious accessibility defect remains.
**Limits:** automated accessibility tools cannot establish complete WCAG compliance.

## 14 — Measure and repair performance

**Purpose:** verify that the finished design remains responsive.
**Files:** measurement records and the files causing each measured issue.

1. Repeat the baseline lab measurements on the production build.
2. Compare 3-run medians under the same conditions.
3. Inspect large image transfers, fonts, JavaScript, and long tasks.
4. Inspect animation smoothness on a modest phone.
5. Repair the largest measured cause first.
6. Repeat only the measurements affected by that repair.
7. Inspect field data when enough visitor traffic exists.

LCP measures the largest content appearance. Target LCP at 2.5 seconds or less.
INP measures response to input. Target INP at 200 milliseconds or less.
CLS measures unexpected layout movement. Target CLS at 0.1 or less.
Apply field targets at the 75th percentile, separately for desktop and mobile.
Source: [Google Web Vitals](https://web.dev/articles/vitals).

Lab results and field results must have separate labels.
Lighthouse loading measurements do not establish field INP.
Do not claim a performance pass from image formats or build success alone.

**Acceptance:** no unexplained material regression remains against the baseline.
Record any unmet target and its cause before final submission review.

## 15 — Run the final submission review

**Purpose:** decide whether the finished website deserves submission.
**Files:** this execution file, the design plan, and a final review record.

1. Review all public routes against the 4 award categories.
2. Compare the finished experience with the selected references.
3. Repeat the visitor understanding and contact tasks.
4. Verify claim evidence and project version information.
5. Verify essential external links and share presentation.
6. Review the final browser and performance records.
7. Record remaining defects with their submission impact.
8. Recommend submission only after required checks pass.

| Readiness level | Meaning |
| --- | --- |
| Planned | Requirements exist; application work remains pending |
| Implemented | Code exists; required verification remains pending |
| Verified locally | Recorded local checks pass; live deployment remains unverified |
| Ready for submission review | Finished public experience and required evidence pass review |

No readiness level promises a jury result.
The final review can reject submission even when every implementation task is complete.
Visual quality, originality, and content coherence remain separate acceptance decisions.

## Increment completion record

Use this record after each implementation increment.

| Field | Record |
| --- | --- |
| Increment | Identifier and scope |
| Files changed | Exact paths |
| Result | Visitor-visible change |
| Checks | Commands and browser tasks completed |
| Evidence | Capture paths and measurement record |
| Limits | Pending or unavailable checks |
| Recovery | Files to restore if the change causes a regression |
| Next increment | The next dependency-ready increment |

### 03 — Project labels and source guidance — 2026-10-04

**Files:** `src/components/site/Experiments.tsx`, `AGENTS.md`.
The plan documents record the owner’s audience choice and implementation status.

**Result:** Settle shows “View project progress.”
Projects with case study sections retain “Read the case study.”
Repository guidance describes the private PDF and extraction fallback.

**Checks:** lint and TypeScript pass after the formatting repair.
The production build passes with Node 22.
Desktop Safari shows the changed action on the local homepage.
The action opens `/projects/settle` with its current progress description.
Safari confirms the other 2 featured projects retain their case study labels.

**Evidence:** before and after captures appear in the implementation conversation.
The browser uses `http://localhost:8080/#experiments`.
The build log uses `/tmp/terry-awwwards-increment03-build.log`.

**Limits:** this repair does not complete Settle’s case study.
At completion of Increment 03, the full device baseline remains pending.
At completion of Increment 03, performance measurements remain pending.
The website remains uncommitted and undeployed.

**Recovery:** restore only the label import, conditional action, and resume guidance edits.
**Next:** finish Increment 01 references, then complete Increment 02 measurements.

### 01 / 02A / 02B — References and baseline — 2026-10-04

**Result:** the reference review compares 3 rendered websites with official award records.
The visual baseline records 40 local production captures.
The performance baseline records 9 warm local browser measurements.

**Evidence:** [reference review](docs/awwwards-review/2026-10-04/REFERENCES.md).
Read [baseline conditions](docs/awwwards-review/2026-10-04/BASELINE.md) before using the measurements.

**Limits:** current reference websites can differ from awarded versions.
Cold mobile measurements, real devices, and other browsers remain pending.
Root error recovery remains a later check.

### 04 — Project card geometry — 2026-10-04

**Files:** `src/components/site/Experiments.tsx`.
**Result:** artwork uses a separate 4:3 area. Text uses normal flow.
The grid uses 1 column on phones, 2 on tablets, and 3 on wide screens.
Descriptions, status, and actions remain visible in the recorded width checks.
Responsive image slot sizes match the new grid.

**Checks:** lint, TypeScript, and the production build pass.
Safari captures cover 375px, 768px, 1024px, and 1440px requested widths.
The recorded console width is 374px for the narrowest run.
No page-level horizontal overflow appears in these runs.

**Evidence:** [card review](docs/awwwards-review/2026-10-04/INCREMENTS.md).
**Limits:** text zoom remains pending.
One image-boundary measurement includes the hover transform instead of the clipping wrapper.
That measurement requires a wrapper-based recheck.
Safari focus changes interrupt attempts to complete these checks.

**Recovery:** restore only the Increment 04 card layout and image slot edits.
Preserve the Increment 03 action labels.

### 05 — Short-screen print sizing — 2026-10-04

**Files:** `src/styles.css`, `src/components/site/Experience.tsx`.
**Result:** the print has a 12rem minimum height.
Desktop sticky positioning applies only when the viewport height reaches 48rem.
Short desktop screens use normal page flow.

**Checks:** lint, TypeScript, and the production build pass.
The generated CSS contains both height clamps and the sticky media rule.
At a 16px root size, the 600px viewport formula gives a 192px image height.
The old formula gives 72px.

**Evidence:** [sizing record](docs/awwwards-review/2026-10-04/increment-05/css-sizing.json).
**Limits:** the formula record is not a browser rendering check.
Short-screen captures and zoom checks remain pending because Safari focus changes interrupt browser control.

**Recovery:** restore only the clamp, sticky utility, and Experience class edits.
**Next:** finish the open browser checks. Increment 06A can use its independent 02A dependency.

### 06A — Project navigation and contact access — 2026-10-04

**Files:** `src/components/site/ProjectNavigation.tsx`, `src/components/site/Nav.tsx`,
`src/routes/projects.tsx`, `src/routes/projects.index.tsx`, and `src/routes/projects.$projectId.tsx`.

**Result:** the shared project header contains Home, Projects, and Contact links.
A closing contact action follows the archive, project pages, and the unknown-project page.
The contact links target `/#contact`.
The existing previous and next project links remain in place.
The homepage uses the menu below 1024px to avoid the crowded tablet navigation.
The menu resize rule uses the same breakpoint.
The project headers remove duplicate opening back links.

**Checks:** lint, TypeScript, and the Node 22 production build pass.
Local production HTTP checks pass on the archive and all 4 project routes.
The unknown project retains HTTP 404.
Each checked project route has 1 main landmark and 1 shared navigation landmark.
Each route has a header contact link and a closing contact link.
The homepage contains the contact destination.

**Evidence:** [route checks](docs/awwwards-review/2026-10-04/increment-06a/route-checks.json).
The local production preview uses `http://localhost:4177`.

**Limits:** client navigation, Back, keyboard, and mobile browser checks remain pending.
Safari focus changes during review. A test line enters another chat during a console check.
Browser control stops after this error. Chrome control returns a timeout.
The 1440px card wrapper check passes. Other wrapper widths and text zoom remain pending.
No change is committed or deployed.

**Recovery:** remove the shared project navigation component and restore this increment's route and breakpoint edits.
Preserve the earlier card, photo, source guidance, and ignore rules.
**Next at completion of 06A:** check browser behavior, then implement Increment 06B focus and fragment history.

### 06B — Section focus and fragment history — 2026-10-04

**Files:** `src/components/site/Nav.tsx`, `src/lib/section-navigation.ts`,
`scripts/section-navigation-test.mjs`, and `package.json`.

**Result:** section links use router navigation to preserve fragment history.
The router keeps existing search parameters.
The section handler focuses the destination heading after navigation.
The handler measures header height before placing the destination below the header.
Repeated selection reaches the same heading without requiring another history entry.
Back and Forward select the stored section.
Reduced motion uses immediate scrolling.
Native skip links, modified clicks, downloads, and external link targets keep their browser behavior.
The menu restores trigger focus after cancellation when the trigger remains visible.
Successful section selection suppresses trigger focus restoration.
Cleanup removes temporary focus attributes and pending animation frames.
A stale navigation completion cannot replace the latest selected focus.

**Checks:** 12 focused regression tests pass.
The tests import the shipped section handler through the existing source compiler.
The tests use simulated page elements and the actual TanStack memory history library.
Lint, TypeScript, and the Node 22 production build pass.
The new command is `npm run test:section-navigation`.
The main `npm test` command includes the new tests.

**Evidence:** [section navigation review](docs/awwwards-review/2026-10-04/SECTION-NAVIGATION.md).
The local production preview uses `http://localhost:4178`.

**Limits:** tests do not run a real browser or the mounted React menu.
Actual Escape focus restoration, client route transitions, browser Back, and visual scroll position remain pending.
The earlier layout checks remain pending where their records state limits.
No change is committed or deployed.

**Recovery:** restore only this increment's Nav handler, focus flag, helper, test, and package script edits.
Preserve the Step 06A menu breakpoint and project navigation.
**Next:** confirm navigation in a browser, then start Step 07A motion preference setup.

### 07A — Motion preferences and entrance lifecycle — 2026-10-04

**Files:** `src/lib/motion-hooks.ts`, `src/lib/useGsapContext.ts`, `src/components/site/Hero.tsx`,
`scripts/motion-lifecycle-test.mjs`, and `package.json`.

**Result:** animation setup reads the current motion preference before creating a timeline.
Reduced motion skips plugin registration, timeline setup, and layout refresh.
Preference changes revert the current context before another context starts.
Media hooks use a current client snapshot with a safe server snapshot.
The Hero uses media contexts for parallax and pointer effects.
A breakpoint change replaces these effects without restarting the entrance.
A static reduced-motion view counts as an existing page entry.
Later preference changes keep the existing Hero content visible.
The change keeps the current motion timing and travel values.

**Checks:** 8 focused lifecycle tests pass.
The tests import the shipped hooks and Hero through the existing source compiler.
The tests use controlled React lifecycle and animation adapters.
The tests do not run a real browser or the real animation engine.
Lint, TypeScript, and the Node 22 production build pass.
The full test suite passes with 3 ingestion checks skipped because `INGEST_KEY` is absent.
The new command is `npm run test:motion-lifecycle`.
The main `npm test` command includes these tests.

**Evidence:** [motion preference review](docs/awwwards-review/2026-10-04/MOTION-PREFERENCES.md).
The local production preview uses `http://localhost:4179`.

**Limits:** first-load motion, preference changes, resize, and route cleanup still require browser confirmation.
The tests check lifecycle decisions. The tests do not prove rendered visibility or animation quality.
The earlier layout and navigation browser checks remain pending.
No change is committed or deployed.

**Recovery:** restore only this increment's motion hooks, GSAP context, Hero setup, test, and package script edits.
Preserve earlier card, photo, navigation, and ignore rules.
**Next:** Step 07B animation failure recovery.

The document follows ASD-100 style rules. The official approved word list was not checked.

### 07B — Animation failure recovery — 2026-10-04

The original bootstrap leaves `html.js` active when client scripts never start.
The script model reproduces that failure before the change.

A head script now starts a 5000 ms recovery timer.
Successful client startup cancels the timer.
A failed startup removes the gate and sets a permanent static-content flag.
Late client startup cannot hide recovered content again.
CSS restores Hero, About, Contact, and generic reveal content.
GSAP setup errors request the same fallback immediately.
Reveal observer errors show the affected block.

**Checks:** 16 motion model tests pass. Lint and TypeScript checks pass.
The production build passes. Local Worker HTTP and compiled CSS checks pass.
The full suite has 262 passes, 0 failures, and 3 skips.
The skipped pipeline checks need `INGEST_KEY`.
These tests use controlled adapters. They do not prove browser rendering.

**Limits:** blocked-script browser captures and interrupted-loading checks remain open.
Normal reveal appearance also needs browser confirmation.
The 5000 ms deadline is a project choice, not an Awwwards rule.

**Evidence:** `docs/awwwards-review/2026-10-04/MOTION-RECOVERY.md`.
**Next:** Step 08A case study evidence. Digital Twin and Settle artwork remains in Step 08C.

### 08A — Digital Twin version and evidence — 2026-10-04

The case study now covers the original Python and Gradio prototype.
The linked public repository supports that scope.
The copy removes mixed-version stack details and unsupported outcome claims.
The public README check uses a cached page. Executable behavior remains unverified.
See `docs/awwwards-review/2026-10-04/DIGITAL-TWIN-EVIDENCE.md`.

**Limits:** a real public product screen remains missing.
Step 08A is partial until media evidence is available.
Dependent Step 08B screen work remains open.
Step 08C includes Digital Twin and Settle artwork changes.

### 08B — Digital Twin explanation structure — 2026-10-04

Optional typed evidence data now drives a focused case study component.
Digital Twin shows a 3-stage system explanation near its opening.
Two notes explain the design choice and the evidence boundary.
A source link leads to the original project repository.
The diagram uses semantic HTML. It needs no image request.
The stages use one column on small screens and 3 columns on large screens.
Other projects omit the optional component.

**Checks:** lint, TypeScript, production build, and static server rendering pass.
The rendering check confirms 3 stages, the diagram label, and the evidence limit.
**Limits:** real product media, direct route checks, and responsive browser inspection remain pending.
Step 08B stays partial. The diagram does not replace its real-screen acceptance requirement.

### Owner-approved illustration path — 2026-10-04

The owner has no Digital Twin product image.
The owner requests generated artwork to continue the design work.
Steps 08A and 08B now permit explicitly labelled concept illustrations.
This changes the media requirement. It does not permit fabricated product evidence.
The prior real-screen requirement becomes an optional evidence improvement for this prototype presentation.
The current copy states the limits.

### Steps 08C–15 — Implementation and review pass

Distinct artwork, project explanations, homepage order, support states, and sharing metadata are implemented.
A local signature prototype remains outside production routes.
The static explanation remains available without extra interaction.
Visitor review, browser review, device checks, and loading medians remain open.
The plan does not mark unavailable checks complete.

**Evidence:** `docs/awwwards-review/2026-10-04/final-design/REVIEW.md`.
**Artwork and exact prompts:** `docs/awwwards-review/2026-10-04/final-design/ARTWORK.md`.
**Checks:** 262 test passes, 3 skips, lint, TypeScript, build, 8 routes, and 4 image responses.
**Limits:** no deployment or submission occurs.

### Step 10B review preparation — 2026-10-04

Two standalone review pages now compare the same source explanation.
The pages use the local prototype component.
The static page exposes the answer. The interactive page uses native disclosure.
The rendering check confirms both states.
A five-reviewer guide and blank results record are ready.
No visitor result is claimed.

**Files:** `docs/awwwards-review/2026-10-04/visitor-review/`.
**Browser limit:** the in-app browser attempt returns `Browser is not available: iab`.
Steps 13 and 14 still require a working controlled browser or real device review.

## Digital Twin scope correction — 2026-10-04

The owner confirms the current portfolio assistant as the case study subject.
This decision replaces the earlier original Python project scope.
The page removes the old GitHub and video links.
The format now includes problem, my role, approach, challenges, lessons, and results.
The diagram describes curated knowledge, hybrid search, and streamed grounded responses.
The visitor review examples now use the same current implementation.
See `docs/awwwards-review/2026-10-04/DIGITAL-TWIN-EVIDENCE.md`.
Earlier original-project references in review history are superseded.
Live provider, delivery, and visitor result checks remain open.

## Step 13 chat repair — 2026-10-04

Supporting chat text now uses full-opacity `bone-dim`.
Source calculations show the old opacity levels reduce contrast below 4.5 on opaque `ink-2`.
The full token measures 8.62 on that background.
Primary chat controls now use minimum 44 px targets at the default root size.
Browser checks remain open for rendered contrast, narrow layouts, and actual target dimensions.
See `docs/awwwards-review/2026-10-04/accessibility-chat/REVIEW.md`.

## Five-increment batch — 2026-10-04

The owner requests batches of five changes before the next report.
This batch completes five concrete implementation increments.

1. Add case study section navigation under Step 08B.
2. Add responsive archive artwork under Step 08C.
3. Shorten the About opening under Step 09.
4. Repair support landmarks and recovery links under Step 12.
5. Add visible keyboard focus rings under Step 13.

Lint, TypeScript, production build, and 262 tests pass.
Three credential-gated pipeline checks skip.
Eight local route checks pass.
The local preview is `http://localhost:4183/`.
The live website remains unchanged.
Browser, visitor, and loading acceptance checks remain open.
See `docs/awwwards-review/2026-10-04/five-step-batch/REVIEW.md`.

## Five-increment batch 2 — 2026-10-04

1. Repair hidden-control handling in chat and menu focus order.
2. Add scrolling and compact spacing to the short-screen mobile menu.
3. Reserve viewport and safe-area space around the chat panel.
4. Correct archive and case study responsive image size hints.
5. Share one accessible recovery screen across page and project 404 routes.

Lint, TypeScript, production build, and 269 tests pass.
Three credential-gated pipeline tests skip.
Eight local HTTP route checks pass.
Seven new focus tests use controlled element adapters.
The updated local preview is `http://localhost:4184/`.
The live website remains unchanged.
Browser, visitor, and loading acceptance checks remain open.
See `docs/awwwards-review/2026-10-04/five-step-batch-2/REVIEW.md`.


## Phone layout batch — 2026-10-04

This batch implements 5 code increments.

1. Adjust Hero text, spacing, and portrait size for phones.
2. Adjust navigation width and menu safe-area padding.
3. Adjust project card padding, text size, and wrapping.
4. Adjust case study spacing, body text, and wrapping.
5. Use the visible viewport to place chat above the phone keyboard.

Lint, types, production build, and diff checks pass.
The suite has 276 passing tests. Three credential-dependent tests remain skipped.
Eight built routes pass HTTP checks.
Real phone rendering and keyboard checks remain open.
The live website has not changed.
The device review and submission gates remain open.

See `docs/awwwards-review/2026-10-04/phone-layout-batch/REVIEW.md`.


## Project browsing and contact batch — 2026-10-04

This batch implements 5 code increments.

1. Add separate role and project contact actions with matching email subjects.
2. Show a clear case study action on archive rows.
3. Add adjacent project cards with subtitles.
4. Match workflow arrow directions to the responsive stage layout.
5. Add concept and workflow links to case study navigation.

This batch supports increments 01, 06A, 08B, 12, and 13.
Lint, types, production build, and diff checks pass.
The suite has 276 passing tests. Three credential-dependent tests remain skipped.
Eight built routes pass HTTP checks.
The contact subjects and local anchor targets pass markup checks.
Browser appearance, real phone use, and email application behavior remain unverified.
The visitor, device, performance, and submission gates remain open.
The live website has not changed.

See `docs/awwwards-review/2026-10-04/browsing-contact-batch/REVIEW.md`.


## Reading and access batch — 2026-10-04

This batch implements 5 code increments.

1. Show reveal groups immediately when keyboard focus enters.
2. Replace the experience hover-only note with a native disclosure.
3. Show project categories and years on homepage cards.
4. Add direct role and project contact actions to project footers.
5. Add case study print styles with visible content and reduced page chrome.

This batch supports increments 03, 06A, 11, 12, and 13.
Lint, types, production build, and diff checks pass.
The suite has 276 passing tests. Three credential-dependent tests remain skipped.
Eight built routes pass HTTP checks.
Browser inventory still provides no browser control surfaces.
Keyboard, touch, print layout, and phone appearance checks remain open.
The live website has not changed.
No submission gate closes from these source and markup checks.

See `docs/awwwards-review/2026-10-04/reading-access-batch/REVIEW.md`.


## Project image repair — 2026-10-04

Restore artwork on Product Discovery and Deep Research case study pages.
Use the shared artwork resolver for every case study.
Replace Product Discovery artwork with a generated paper composition matching the featured project palette.
The new artwork appears on the homepage, archive, and case study.
Keep a concept caption on every case study image.

Lint, types, build, and diff checks pass.
A new HTTP check covers 6 routes and 44 image candidates.
All candidates return valid image responses.
Browser decoding and rendered visibility remain unverified.
The reported page location is still awaiting owner clarification.

See `docs/awwwards-review/2026-10-04/project-image-repair/REVIEW.md` for assets and the exact generation prompt.


## Remaining homepage phone layouts — 2026-10-04

This batch implements 5 section changes.

1. Reduce About phone spacing and body text size.
2. Reduce Experience phone spacing and timeline indentation.
3. Improve Capabilities wrapping and short-screen positioning.
4. Stack Credentials cards on phones and label the expansion control.
5. Reduce Beyond Work phone spacing and improve its contact target.

This batch supports increments 05, 09, and 13.
Lint, types, production build, and diff checks pass.
The suite has 276 passing tests. Three credential-dependent tests remain skipped.
Homepage markup and compiled layout rules pass source checks.
All 44 image assets pass HTTP checks across 6 routes.
Real phone appearance and credential interaction checks remain open.
The live website has not changed.
The device and submission gates remain open.

See `docs/awwwards-review/2026-10-04/homepage-phone-batch/REVIEW.md`.


## Final local review — 2026-10-04

The implementation has reached final review.
The plan remains open for acceptance evidence.
The owner can arrange 5 testers. Results are not yet collected.

Repair the remaining Deep Research sharing image metadata.
Announce the actual sitemap in robots.txt.
Export an offline Digital Twin story for the visitor review links.
Package the 2 versions, story, guide, and results form in `visitor-review.zip`.

Build, lint, types, and diff checks pass.
The suite has 276 passing tests, 0 failures, and 3 credential-dependent skips.
Eight routes pass status, heading, and landmark checks.
Six public routes pass canonical, sharing, and sitemap checks.
All 44 image candidates return valid image responses.
Local fragment targets are valid.

Final preview: http://localhost:4191/
Use this preview for the current build.
No commit, push, deploy, or award submission occurred.

Remaining work requires 5 visitor results, browser/device review, loading measurements, and live content/service evidence.
Step 10C still depends on visitor results.
No submission readiness or award result is claimed.

See `docs/awwwards-review/2026-10-04/completion-review/REVIEW.md` for the full acceptance map.


## Visitor follow-up audit — 2026-10-04

The owner reports positive visitor feedback about the site's appearance.
Do not treat that report as completed browser testing or detailed prototype results.
The current local image audit passes for 44 files across 6 routes.
Browser access remains unavailable.

The source audit identifies 2 chat findings.
New chat can clear an active response without cancelling generation.
Phone Enter sends a message despite the stated newline intent.
Both findings need repair and interaction confirmation.
No application source changes occur in this audit.
The final acceptance gates remain open.

See `docs/awwwards-review/2026-10-04/visitor-followup-audit/REVIEW.md`.


## Chat control repair — 2026-10-04

Repair both findings from the visitor follow-up audit.
Disable New chat during generation and guard the reset against an active request.
Preserve Enter newlines for coarse primary input devices.
Keep desktop Enter sending, Shift+Enter newlines, and composition safety.
Update the composer hint to match the input mode.

Seven new regression tests pass.
Full suite: 283 passes, 0 failures, 3 credential-dependent skips.
Lint, types, build, and diff checks pass.
Six routes and 44 image assets pass the preview check.
Real phone and browser interaction checks remain open.
Preview: http://localhost:4192/
The live website has not changed.

See `docs/awwwards-review/2026-10-04/chat-control-repair/REVIEW.md`.


## Final local implementation and browser review — 2026-10-04

All planned application changes are implemented.
The current production choice keeps the static project story.
The owner reports positive visitor feedback about the site appearance.
No controlled prototype comparison result is invented.

The Chromium review covers 48 route and viewport combinations.
The review finds no horizontal overflow, broken images, or hidden reveals.
An 8-route accessibility scan reports no violations.
Some colour contrast checks remain incomplete.
The 18 local loading runs give median LCP values of 200–248 ms.
These local measurements use no network or CPU throttling.

This review repairs long chat message wrapping, empty input height, and print page margins.
The final build passes lint, types, build, and whitespace checks.
The test suite has 283 passes, 0 failures, and 3 credential-dependent skips.
The final image check passes for 44 assets across 6 routes.

Current preview: http://localhost:4194/.
Earlier browser-unavailable notes are historical records.
Use the current review for the latest result.

Physical devices, other browsers, manual accessibility, and live service checks remain unverified.
The controlled 5-visitor comparison remains unverified.
These evidence limits prevent a claim that every submission gate has passed.
The code work is complete within the current design scope.
No commit, push, deploy, or award submission occurs.

See [the final browser review](docs/awwwards-review/2026-10-04/browser-completion/REVIEW.md).


## Git delivery — 2026-10-04

The owner authorizes a commit and push on `feat/awwwards-design`.
Local portfolio previews are closed.
The earlier preview links are historical records.
A feature-branch push does not deploy the live website.
The final review limits remain unchanged.
