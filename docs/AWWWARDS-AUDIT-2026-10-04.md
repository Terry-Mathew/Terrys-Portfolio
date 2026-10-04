# Awwwards audit — 2026-10-04

## Result

The website has a strong visual foundation. The website is not ready for an award submission.
The main gap is visible proof of the work. The second gap is a distinct interactive idea.
An award remains a jury decision. This audit cannot predict a win.

Keep the personal photography, warm paper, dark opening, and restrained orange accent.
Build the next design around one promise: **From complexity to clarity.**
This is a proposed direction. No website changes implement this direction yet.

## Evidence and scope

The original audit checks branch `feat/rag-followup` at commit `5cf3943`.
PR #7 merges that work into `main`.
Design work now uses `feat/awwwards-design`, created from `origin/main` at `cc035e6`.
The branch change does not re-audit the newer code.
The working tree starts clean. The audit does not change application code.
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
The case study selector skips absent fields. The homepage still says “Read the case study.”

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
The live Digital Twin page confirms the missing main navigation.

Suggested change: add a consistent route header and a short project closing action.
Use the same type, surface colors, and action style across routes.

Acceptance: visitors can return home or contact Terry from every project page.

### F08 — Medium: resume guidance no longer matches the checkout

AGENTS.md says `public/Terry-Mathew-CV.pdf` exists. The current public folder has no PDF.
The current homepage has no resume action. The extraction script still refers to the PDF workflow.
An earlier search representation shows resume links. The refreshed Safari page does not show those links.
Use the current checkout and live browser as evidence.

Evidence: current public file inventory, `src/components/site/Hero.tsx`, `src/components/site/Contact.tsx`.
Evidence: `scripts/extract-cv.mjs`.

Suggested change: establish whether removing the resume was intentional.
Restore a verified resume action if hiring remains a website goal.
Update repository guidance to match the chosen content process.

Acceptance: repository instructions match available assets and visible actions.

### F09 — Medium: short-screen print sizing has no lower bound

The desktop print height subtracts `33rem` on short screens.
At a 16px root size, a 600px viewport produces a 72px image height.
Below 528px, the expression becomes negative. The CSS has no minimum height clamp.
The rendered effect remains unverified at those sizes.

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

Suggested change: test blocked client scripts and interrupted loading.
Ensure important content becomes visible after an animation setup failure.

Acceptance: the name, main statement, and actions remain readable after a client failure.

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
The audit does not measure performance or validate every external link.
The audit does not inspect the separate Digital Twin repository.
The audit does not verify deployment ancestry or claim the local commit matches the live deployment.
The audit does not change application code, commit changes, deploy, or submit to Awwwards.

The report follows ASD-100 style rules. The official approved word list was not checked.
