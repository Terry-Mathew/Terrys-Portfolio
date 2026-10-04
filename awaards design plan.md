# Awwwards design plan — 2026-10-04

## Result

The website has a strong visual foundation. The website is not ready for an award submission.
The main gap is visible proof of the work. The second gap is a distinct interactive idea.
An award remains a jury decision. This audit cannot predict a win.

Keep the personal photography, warm paper, dark opening, and restrained orange accent.
Build the next design around one promise: **From complexity to clarity.**
The reference review supports this direction. The signature project sequence remains unimplemented.

## Implementation direction — 2026-10-04

The owner selects hiring managers and potential clients.
Both groups need clear project evidence before a contact action.
Hiring managers need role scope, decisions, and supported results.
Potential clients need problem scope, working examples, and project contact details.
Use one project story for both groups. Provide 2 clear contact paths.

Keep Oswald for headings, Newsreader for editorial text, and the existing body type.
Keep warm paper, graphite, and the orange accent.
Use real photography for the personal story.
Use real product evidence for project stories.
Use motion to show order, state changes, and relationships.
Keep each story readable without motion.
The signature idea remains a bounded problem-to-decision demonstration.
Show the same explanation as static content when interaction is unavailable.
The reference review supports the promise. Visitor tests still need to check the signature sequence.

Increment 03 repairs the Settle action label.
Increment 03 also corrects private resume guidance.
Increment 04 separates project text from artwork. Its width checks pass; zoom checks remain open.
Increment 05 adds a minimum photo height. Short desktop screens use normal page flow.
Increment 05 passes source checks. Browser capture and zoom checks remain open.
Increment 06A adds project navigation and closing contact actions.
The tablet menu breakpoint moves to 1024px. Browser interaction checks remain pending.
Increment 06B adds fragment history and destination heading focus.
The section handler passes regression tests. Browser confirmation remains pending.
Increment 07A reads motion preferences before animation setup.
The Hero separates responsive effects from its entrance. Lifecycle tests pass; browser confirmation remains pending.
Increment 07B adds a 5000 ms startup recovery deadline.
Setup failures show static content immediately. Failure model tests pass; browser checks remain open.
These repairs do not establish award readiness.

## Evidence and scope

The original audit checks branch `feat/rag-followup` at commit `5cf3943`.
PR #7 merges that work into `main`.
Design work now uses `feat/awwwards-design`, created from `origin/main` at `cc035e6`.
The follow-up source audit checks `cc035e6` against this plan.
A fresh fetch confirms that the design branch matches `origin/main`.
The original live checks remain historical evidence. The follow-up audit does not repeat those checks.
The original audit starts with a clean working tree.
The planning turn preserves both existing untracked documents.
The planning turn changes no application code.
The audit inspects source files, public assets, scripts, and the deploy workflow.
The audit visually checks the live homepage in desktop Safari.
The audit also checks the live Digital Twin page and chatbot panel.
Homepage section links scroll to their sections. The contact reveal completes.
The chatbot answers its suggested architecture question with 3 source entries.
Escape closes the chatbot panel.
These checks do not prove complete chatbot accuracy or source validity.

`npm run lint` passes. `npx tsc --noEmit` passes.
The audit does not run the build or full server test suite.
Those checks cannot prove visual quality or measured browser performance.

## Actual award categories

Awwwards lists Design at 40%, Usability at 30%, Creativity at 20%, and Content at 10%.
The official evaluation page confirms these weights in its HTML description.
Source: [Awwwards evaluation](https://www.awwwards.com/about-evaluation/).

Technology remains an engineering audit area here. Technology is not the fourth main scoring category.
This report does not assign jury scores. Usability measurements remain incomplete.

| Category | Assessment | Main gap |
| --- | --- | --- |
| Design — 40% | Strong foundation; uneven project presentation | Project artwork does not show the products |
| Usability — 30% | Useful safeguards; incomplete device testing | Mobile, keyboard, and performance proof remain incomplete |
| Creativity — 20% | Clear personal style; limited signature interaction | Motion reveals content but rarely explains the work |
| Content — 10% | Clear positioning; weak case study evidence | Missing project sections and unsupported outcome detail |
| Technology — additional audit | Good image and motion structures | Visual regression and performance checks are missing |

## Findings

### F01 — High: case studies need visible evidence

The Digital Twin page uses repeated text sections. The page has no embedded product screens, diagrams, or interactive demonstration.
The page links to code and an external video. Visitors must leave the page to inspect that proof.
The case study template has no media field or media block.

Evidence: `src/routes/projects.$projectId.tsx`, `ProjectDetail`.
Evidence: `src/content/projects.ts`, `Project` interface.
The live Digital Twin page confirms the text presentation.

Suggested change: use one real product screen near the opening.
Add a short problem, decision, result sequence. Add a compact system diagram where the diagram explains a decision.
Use dated results with their test conditions. Keep prototype results separate from production results.
Do not create claims to fill the layout.

Acceptance: each complete case study shows the product without an external link.
Each outcome names the evidence or states its limits.

### F02 — High: Settle promises a case study without case study sections

Settle has a title, description, status, and category. Settle has no problem, approach, challenges, learnings, or outcomes fields.
The original case study selector skips absent fields. The original homepage says “Read the case study.”
Increment 03 repairs the label to “View project progress.”

Evidence: `src/content/projects.ts:87`, `caseStudySections`.
Evidence: `src/components/site/Experiments.tsx:86`.
This is a source-confirmed content gap. The audit does not visually inspect the live Settle detail page.

Suggested change: add a truthful progress page or change the link label.
Show the current stage, one real screen, and the next question under test.
Do not describe unfinished work as a complete case study.

Acceptance: the link label matches the content visitors receive.

### F03 — Medium: Digital Twin repeats Settle artwork

The artwork map has no `digital-twin` entry. The fallback uses Settle artwork.
Digital Twin and Settle therefore use the same image sources.
The live homepage shows the repeated illustration.

Evidence: `src/components/site/Experiments.tsx:22`, `artwork`, `projectArtwork`.

Suggested change: give Digital Twin its own product image or editorial diagram.
Replace Settle's current card image with a verified product screen or product-specific composition.
Both image replacements are explicit tasks in Increment 08C.
Neither image replacement is implemented yet.
Give each featured project a distinct composition within the same visual system.
Use decorative empty alt text when the artwork adds no information.
Use useful alt text when the artwork explains the product.

Acceptance: each featured image helps visitors recognise its project.

### F04 — High: the project identity needs a clear version

The Digital Twin case study lists Python, DeepSeek, and Vercel Serverless.
The current portfolio uses TanStack Start and Cloudflare services.
The live chatbot describes Vectorize, D1, and OpenRouter.
The case study links to a separate Digital Twin repository from 2025.
That project may describe an earlier version. The current page does not explain the relationship.

Evidence: `src/content/projects.ts:31`, `package.json`, `src/server/chat.ts`.
Evidence: the live architecture answer.

Suggested change: explain whether the case study covers the original project or this portfolio implementation.
Show the version date. Describe the change between versions when useful.
Review “verified contact details” for accuracy. Input checks do not automatically prove email ownership.

Acceptance: the page, demonstration, repository link, and technology list refer to a clear version.

### F05 — Medium: work appears after a long introduction

The homepage shows About and Experience before Projects.
The navigation provides a direct Projects link. That link reduces the problem for visitors who use navigation.
Visitors who scroll must read career material before seeing the products.

Evidence: `src/routes/index.tsx:64`.

Suggested change: test Hero, Selected Work, About, Experience, then supporting sections.
Keep contact access visible. Give each section one clear purpose.
Shorten the About opening so visitors can scan the main point.
“Not just a portfolio” does not explain what visitors will discover.

Acceptance: new visitors can identify one product and Terry’s role within 30 seconds.
Test this target with visitors. Do not treat this target as an official award rule.

### F06 — High: creativity needs one interaction that explains the work

The hero uses layered scroll movement and a portrait reveal.
The site uses image reveals, section entrances, and timeline markers.
Shared durations and easing keep the motion consistent.
These patterns support presentation. These patterns do not yet demonstrate Terry’s problem-solving process.

Evidence: `src/components/site/Hero.tsx`, `src/lib/motion.ts`, `src/components/site/Experience.tsx`.

Suggested change: prototype one “From complexity to clarity” sequence inside Selected Work.
The sequence starts with a real problem. Visitor input reveals the structure, decision, and output.
Use a simplified project example with public evidence.
Provide buttons for each stage. Give keyboard and touch visitors the same information.
Keep the complete explanation visible when motion is reduced.

Acceptance: visitors can explain the project more accurately after using the sequence.
Compare the sequence with a static version. Keep the sequence only if the sequence improves understanding.

### F07 — Medium: project pages lose the main contact path

The homepage owns the navigation and contact section.
The project layout renders only an outlet. Detail pages provide archive and adjacent-project links.
Detail pages have no direct contact action or shared site footer.

Evidence: `src/routes/index.tsx`, `src/routes/projects.tsx`, `src/routes/projects.$projectId.tsx`.
The original live Digital Twin page confirms the missing main navigation.
Increment 06A adds shared Home, Projects, and Contact access to local project routes.
The closing contact action follows each project route. HTTP checks pass; browser interaction checks remain pending.

Suggested change: add a consistent route header and a short project closing action.
Use the same type, surface colors, and action style across routes.

Acceptance: visitors can return home or contact Terry from every project page.

### F08 — Documentation: preserve the intentional resume removal

The original audit did not establish why the public resume disappeared.
The follow-up source audit confirms that the removal was intentional.
The extraction script now reads `private/Terry-Mathew-CV.pdf`.
If the private source is absent, the script keeps checked-in chatbot knowledge.
The merged work includes the commit “Remove public resume download.”

Evidence: `scripts/extract-cv.mjs:18`, merged PR #7, and the public asset history.
The original AGENTS.md describes the former public PDF process.
Increment 03 corrects this guidance without restoring the public PDF.

Suggested change: update the repository guidance to describe the private source.
Do not restore the public PDF as a design improvement.
Public resume access requires a separate owner decision.

Acceptance: the design preserves the current private resume process.
Repository guidance matches the implemented extraction path.

### F09 — Medium: short-screen print sizing has no lower bound

The desktop print height subtracts `33rem` on short screens.
At a 16px root size, a 600px viewport produces a 72px image height.
Below 528px, the expression becomes negative. The CSS has no minimum height clamp.
Increment 05 adds a 12rem lower bound. Sticky positioning applies only at desktop heights of at least 48rem.
The production CSS contains both rules. Short-screen rendering and zoom remain unverified.

Evidence: `src/styles.css:626`.

Suggested change: use a positive minimum or remove sticky print behavior on short screens.
Keep viewport calculations in the CSS utility, as AGENTS.md requires.

Acceptance: the image remains readable at 1024×600 and browser zoom.
The image must not depend on an invalid negative height.

### F10 — Medium: animation recovery needs failure testing

The head script adds `html.js` before client code runs.
CSS hides reveal elements when that class exists.
Reduced-motion and no-script paths provide useful safeguards.
But enabled JavaScript with a failed client bundle is a separate case.
The hero gate has no equivalent to the About and Contact failure attributes.

Evidence: `src/routes/__root.tsx`, `src/styles.css:208`, `src/components/site/Hero.tsx`.
This is a source risk. The audit does not reproduce a live bundle failure.

Increment 07B reproduces the blocked-client gate in a script model.
The new head script removes the gate after 5000 ms without successful startup.
Successful startup cancels recovery. Late startup cannot hide recovered content.
Setup errors request a static presentation immediately.
Browser failure captures and interrupted loading remain unverified.

Suggested check: test blocked client scripts and interrupted loading in a browser.
Ensure important content becomes visible after an animation setup failure.

Acceptance: the name, main statement, and actions remain readable after a client failure.

### F11 — Medium: first-load motion must respect visitor settings

The original reduced-motion hook starts with `false`. The original desktop hook also starts with `false`.
Both hooks update their values inside `useEffect`.
Animation setup uses `useLayoutEffect`, which can run before those updates.
The code therefore needs first-load checks for reduced motion and desktop setup changes.
This original source pattern is verified. Visible flicker remains unverified.
Increment 07A reads the current preference synchronously before GSAP setup.
The media hooks use current client snapshots with safe server snapshots.
The Hero rebuilds responsive effects without replaying its entrance.
Lifecycle regression tests pass. First-load browser confirmation remains pending.

Evidence: `src/lib/motion-hooks.ts`, `src/lib/useGsapContext.ts`, `src/components/site/Hero.tsx`.

Suggested change: establish motion preferences before creating animation timelines.
Keep server-rendered content readable. Test initial loading, resize, and changes to motion preferences.

Acceptance: reduced-motion visitors receive no entrance movement on first load.
Desktop setup does not restart visible entrances when the breakpoint state updates.

### F12 — Medium: section navigation must preserve focus and history

The original homepage intercepts section link clicks. The original handler prevents native fragment navigation.
The original handler scrolls without updating the URL or destination focus.
Increment 06B uses router fragment navigation and destination heading focus.
The handler measures the fixed header height before scrolling.
The menu returns focus after cancellation, but preserves destination focus after successful selection.
Regression tests pass. Real browser confirmation remains pending.
The skip link correctly opts out of this handler.
The mobile menu restores focus to its trigger after closing.
This behavior needs separate rules for cancellation and section selection.

Evidence: `src/components/site/Nav.tsx`, section click handler and menu cleanup.

Suggested change: keep meaningful fragment URLs and browser history.
Move focus to the destination after a keyboard section selection.
Restore trigger focus after Escape or menu cancellation.

Acceptance: Back restores a useful location. Shared section URLs reach the selected section.
Keyboard visitors continue reading from the selected section.

### F13 — Polish: sharing metadata needs route-level review

The route files provide titles and descriptions. The root route provides one shared image.
The reviewed files do not define canonical links or `og:url`.
All routes use the same share image.
This is a presentation improvement, not a stated Awwwards scoring requirement.

Evidence: `src/routes/__root.tsx`, project route head definitions, and `public/sitemap.xml`.

Suggested change: give each route its correct canonical URL and share URL.
Use project-specific share images when real project media exists.
Keep the sitemap consistent with public routes.

Acceptance: each shared project link identifies that project accurately.
Unknown routes retain a real 404 response.

### F14 — Medium: card layout must adapt to the content

Homepage project cards use a fixed image height. Text sits in an absolute overlay.
The layout changes to 3 columns at the tablet breakpoint.
Long text can compete with the artwork at narrower card widths.
The source pattern is verified. Actual overlap needs browser testing.

Evidence: `src/components/site/Experiments.tsx:63`, `ProjectCard`, and `md:grid-cols-3`.

Suggested change: test a separate image and text layout on smaller screens.
Use 1 or 2 columns where the content requires more width.
Keep descriptions concise. Do not hide essential status or actions.

Acceptance: complete titles, status, and actions remain visible at every test width.
Cards remain readable with text zoom.

Increment 04 replaces the overlay with separate artwork and text areas.
The grid uses 1, 2, or 3 columns according to width.
Local Safari checks show readable content without page overflow at the recorded widths.
Text zoom remains pending.

### F15 — Polish: complete the visual system beyond the homepage

The root error and 404 views use a generic body-font presentation.
Project archive and detail pages use the editorial display style.
The plan must cover error, empty, loading, and recovery views.
A finished homepage alone does not establish a finished website.

Evidence: `src/routes/__root.tsx`, `src/routes/projects.index.tsx`, and project detail route.

Suggested change: use the same visual rules for support states.
Keep error recovery direct. Do not delay recovery actions with decorative animation.

Acceptance: all public routes and support states share the same identity.

## Full framework assessment

| Area | Existing strength | Required improvement or check |
| --- | --- | --- |
| Typography | Display, editorial, handwriting, and body roles | Check 4 font families against reading speed and download cost |
| Layout | Strong hero hierarchy and generous spacing | Add product evidence; test fixed card content at tablet widths |
| Color | Shared paper, ink, and accent tokens | Measure all rendered text and focus contrast |
| Imagery | Real portraits and personal photographs | Replace repeated project illustration with specific product evidence |
| Brand | Warm personal editorial identity | Extend one concept through projects and interactions |
| Information structure | Named sections and project routes | Test earlier placement of Selected Work |
| Navigation | Direct homepage links and mobile menu code | Add consistent route navigation and contact access |
| Interaction feedback | Hover/focus rules, chat states, filter buttons | Test full keyboard, touch, loading, empty, and failure states |
| Accessibility | Skip link, alt text, focus outlines, motion preferences | Complete keyboard, screen reader, zoom, and contrast checks |
| Device support | Responsive image sizes and mobile motion values | Check actual phone and tablet layouts across browsers |
| Story and voice | Clear career thread and personal tone | Replace broad claims with short project decisions and proof |
| Media | Responsive AVIF/WebP sources and lazy project images | Add meaningful screens or short demonstrations |
| Performance | Image dimensions, priority control, direct GSAP transforms | Obtain repeatable browser measurements and field data |
| Technical innovation | Retrieval chatbot with streamed answers | Present a useful public explanation of the system |
| Creative coding | Existing GSAP foundation | Prototype the signature idea before choosing additional tools |
| Animation craft | Shared timing, easing, stagger limits, cleanup | Use anticipation and continuity where an action needs explanation |
| Scroll interaction | Layered hero and timeline states | Connect motion to project meaning; preserve native scrolling |
| Originality | Real life images and personal visual treatment | Develop one recognisable interaction tied to Terry’s work |
| Emotional effect | Personal photographs add warmth | Test whether visitors remember both Terry and one project |
| Strategic purpose | Explore Work and contact actions | Define whether hiring, collaboration, or services has priority |
| Prototyping | Development motion self-test exists | Compare one static project story with one interactive prototype |
| User testing | No evidence of visitor tests in reviewed files | Test 5 visitors for finding work, understanding work, and contact |
| Engineering quality | Lint and TypeScript checks pass | Add focused browser checks for important visitor paths |
| Release checks | Workflow checks server behavior and builds | Add visual and performance checks before an award submission |
| Opening | Strong name and portrait composition | Make product evidence easy to reach |
| Journey | Clear career sections | Build a shorter path from promise to proof |
| Closing | Large contact heading and direct email | Add the same clear closing path to project pages |

These assessments are design judgments unless a finding names a verified behavior.
No reviewed file proves that visitor testing occurred. That does not prove testing never occurred.

## Performance targets

Use Core Web Vitals rather than an undefined “loads under 3 seconds” rule.
LCP measures when the largest visible content appears. Target LCP at 2.5 seconds or less.
INP measures response to visitor input. Target INP at 200 milliseconds or less.
CLS measures unexpected layout movement. Target CLS at 0.1 or less.
Apply these targets at the 75th percentile, separately for mobile and desktop.
Source: [Google Web Vitals](https://web.dev/articles/vitals).

The PageSpeed API returns HTTP 429 during this audit.
The audit has no Lighthouse result, field percentile, frame-rate recording, or CPU profile.
Image optimization in code does not prove these targets pass.

## Proposed design direction

**Promise:** Terry turns unclear problems into usable systems.
**Visual language:** warm paper, dark scenes, real photographs, restrained orange connections.
**Type:** strong display headings, short editorial statements, quiet body text.
**Project media:** real screens, useful annotations, and simple system diagrams.
**Motion:** reveal relationships before revealing detail. Keep direct action feedback short.
**Signature interaction:** one project changes from problem to structure to usable output.
**Closing:** invite a relevant conversation after visitors see the proof.

Use the existing stack for the first prototype. The concept does not require WebGL, custom fonts, or sound.
Add another technology only when the concept needs that technology.
Do not animate every element. Preserve readable static content and native scrolling.

## Follow-up audit of the plan

Completing a checklist does not prove award quality.
The revised plan can support a credible submission if the finished website passes its review gates.
Design quality and originality still require judgment after implementation.
The plan does not guarantee an Honorable Mention or Site of the Day.

| Category | Earlier plan coverage | Added requirement | Readiness now |
| --- | --- | --- | --- |
| Design | Typography, photography, project media | Route consistency, support states, clear visual review standard | Not implemented |
| Usability | Navigation, accessibility, device checks | Focus/history, first-load preferences, content-driven card sizes | Not verified |
| Creativity | One signature project story | Reference comparison, storyboard, static-versus-interactive test | Concept only |
| Content | Case studies and project versions | Claim evidence register, media provenance, no public PDF restoration | Incomplete |
| Technology | Image optimization and performance | Recorded baseline, route-change tests, failure recovery | Incomplete |

### F16 — Medium: tablet navigation crowds the site name

The 768px baseline shows desktop navigation crowding the site name.
Increment 06A changes the homepage menu breakpoint to 1024px.
The menu resize rule uses the same breakpoint. The repaired tablet layout still needs browser verification.
The navigation must retain keyboard access and clear contact access.
Evidence: [the baseline report](docs/awwwards-review/2026-10-04/BASELINE.md).

### Reference comparison

Before visual changes, compare 3 current awarded portfolios from the official gallery.
Record the award label and review date. Inspect the actual websites, not only gallery thumbnails.
Compare opening clarity, project proof, motion, mobile behavior, and closing actions.
Record transferable principles. Do not copy layouts, assets, or interactions.
The completed review compares 3 rendered websites with official award records.
The current websites can differ from their awarded versions.
Read [the reference review](docs/awwwards-review/2026-10-04/REFERENCES.md) for evidence and limits.
Source: [Awwwards portfolio gallery](https://www.awwwards.com/websites/portfolio/).

### Visual review standard

Review each public route at 375px, 768px, 1024px, and 1440px widths.
Also check 320px width, 1024×600, 200% zoom, and landscape phones.
These are project test sizes, not official award rules.
Use the same captures before and after each visual increment.

Each screen needs a clear main subject, readable hierarchy, useful spacing, and a visible next action.
Project media must communicate the product. Decoration must support the chosen concept.
Type, color, spacing, and motion must follow named shared rules.
Treat mixed project styles or generic placeholder states as unfinished work.

### Motion storyboard

Define the trigger, target, duration, purpose, and static alternative for each motion sequence.
Connect the opening, Selected Work, signature sequence, and closing through consistent pacing.
Preserve native scrolling. Avoid forced loaders, cursor replacement, automatic audio, and blocking transitions.
Those effects are not required by the concept.
Use a short route transition only if the transition improves continuity.
Keep unsupported browsers on normal navigation.

### Evidence register

Record each featured claim with a source, date, implementation status, and permitted public detail.
Use real screenshots or recorded demos. Remove sensitive details before public use.
Record image rights and font licenses for assets selected for publication.
Do not publish invented metrics or reconstructed product screens as real evidence.
Label illustrative diagrams as illustrations.

### Performance baseline

Measure the current production build before selecting new effects.
Record test route, build commit, browser version, device profile, network settings, and run count.
Compare medians from 3 lab runs under the same conditions.
Measure transferred JavaScript, image sizes, font requests, and layout movement.
Measure interaction behavior separately. Lighthouse loading tests cannot establish real-user INP.
Set asset budgets from that baseline. Explain any later budget increase.
Use field data when enough real traffic exists.
Source: [Google Web Vitals](https://web.dev/articles/vitals).

### Visitor review

Test with 5 people who resemble the chosen audience.
Ask visitors to explain Terry’s work, identify one project decision, and find the contact action.
Ask visitors to recall one distinctive detail after viewing the website.
Compare the signature interaction with its static version.
A small test reveals confusion. A small test does not establish statistical certainty.
Revise the design when visitors remember the effects but cannot explain the work.

### Execution control

The execution file is `awwards design steps.md`.
Use small increments for state changes, motion safety, route structure, and new media rendering.
Use one pass for a bounded label, content, or CSS change.
Do not bundle simple repairs with the signature interaction.
Record files changed, checks, evidence, and remaining limits after each increment.
Keep the original audit in `docs/AWWWARDS-AUDIT-2026-10-04.md` as historical evidence.
Use this root design plan as the current decision document.

## Steps

1. Define the main visitor and desired contact action.
2. Confirm the proposed brand promise.
3. Collect real screens and dated evidence for 2 featured projects.
4. Resolve Settle’s case study label and content.
5. Clarify the Digital Twin version.
6. Create distinct project artwork from the real product evidence.
7. Prototype the signature project sequence.
8. Compare the prototype with the static explanation using 5 visitors.
9. Apply the selected sequence across desktop, touch, keyboard, and reduced-motion views.
10. Complete route navigation and closing actions.
11. Check phone, tablet, short-screen, zoom, and browser layouts.
12. Measure performance under recorded test conditions.
13. Recheck every route before submission.

## Submission acceptance

| Check | Required evidence |
| --- | --- |
| Design | Consistent finished routes; distinct project media; no unfinished featured case study |
| Usability | Complete core paths with keyboard, touch, and screen reader checks |
| Creativity | One memorable concept that improves understanding in visitor tests |
| Content | Version clarity; real screens; supported claims; accurate project status |
| Performance | Recorded lab results; field results when enough traffic exists |
| Motion | Reduced-motion view; interrupted loading recovery; stable route changes |
| Devices | Chrome, Safari, Firefox, iOS Safari, and Android Chrome checks |

These are proposed project acceptance checks. These checks are not an official award guarantee.

## Limits

The audit does not verify actual mobile devices, Firefox, Chrome, or a screen reader.
The audit does not certify WCAG compliance. WCAG defines web accessibility requirements.
The follow-up records 9 local browser measurements. Cold mobile performance remains pending.
The review does not validate every external link.
The audit does not inspect the separate Digital Twin repository.
The audit does not verify deployment ancestry or claim the local commit matches the live deployment.
The historical audit and planning turns change no application code.
Increment 03 is complete. Increment 01 and the bounded visual baseline are complete.
Increments 04, 05, 06A, 06B, 07A, and 07B contain code. Required browser checks remain open.
Read [the baseline report](docs/awwwards-review/2026-10-04/BASELINE.md) for measurement conditions.
No changes are committed, deployed, or submitted to Awwwards.

The report follows ASD-100 style rules. The official approved word list was not checked.

## Step 08A evidence update — 2026-10-04

Digital Twin now describes the original Python and Gradio prototype.
The linked repository does not support the previous mixed-version stack.
The page removes verified-contact and unmeasured cost claims.
A real product screen remains required for Step 08B.
The evidence record separates repository documentation from tested behavior.
See `docs/awwwards-review/2026-10-04/DIGITAL-TWIN-EVIDENCE.md`.

## Step 08B visual update — 2026-10-04

Digital Twin now shows an explanatory system diagram above its written case study.
The diagram separates personal context, visitor conversation, and contact tools.
The page identifies the diagram as an explanation of the original prototype.
Optional evidence data keeps other projects working without missing-media blocks.
The real product screen remains an open requirement.
Responsive browser inspection remains open.

## Remaining design implementation — 2026-10-04

The owner permits generated illustrations because product screens are unavailable.
Digital Twin and Settle now have distinct concept illustrations.
Each illustration is labelled. Neither illustration claims to show the actual product.
Product Discovery AI has a source-backed workflow diagram.
Settle has a truthful progress presentation.
Selected Work follows the Hero.
Support states, filter feedback, route sharing, and canonical URLs are repaired.
The local signature prototype remains unpublished pending visitor review.
The static explanation stays in production.

### Remaining award submission requirements

1. Compare the signature prototype with the static explanation using five real visitors.
2. Review the final pages with keyboard, screen reader, touch, and zoom.
3. Inspect artwork crops and page composition in controlled browsers.
4. Run the device review matrix.
5. Measure three-run loading medians under the baseline conditions.
6. Review real project outputs when available.
7. Confirm external demo playback and current project status.
8. Review the deployed build before submission.

The code checks and HTTP checks pass.
The site is not yet confirmed ready for an award submission.
See `docs/awwwards-review/2026-10-04/final-design/REVIEW.md`.

## Visitor review materials — 2026-10-04

Step 10B has two standalone comparison pages and a reviewer guide.
The comparison keeps the question, answer, source, and limits consistent.
Actual visitor feedback remains required.
The in-app browser review surface is unavailable.
Browser and device acceptance checks remain open.

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
