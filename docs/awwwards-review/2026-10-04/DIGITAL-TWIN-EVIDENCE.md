# Digital Twin — Current portfolio implementation

Checked: 2026-10-04.

## Scope correction

The owner confirms that Digital Twin means the assistant in this codebase.
The old Python project is a different implementation.
This record replaces the earlier original-project scope.
The public page has no old GitHub link or old video link.
The conceptual artwork remains suitable for the current project.

## Case study format

The page follows problem, my role, approach, challenges, lessons, and results.
The role describes owner direction and AI-assisted development.
The existing knowledge file supports that role.
The year identifies the current 2026 implementation.
The status says Portfolio assistant without claiming a fresh live service check.

## Evidence map

| Claim | Current source |
| --- | --- |
| Portfolio assistant and personal project role | `src/content/knowledge/experiments.md` |
| React interface and source links | `src/components/site/ChatWidget.tsx` |
| Workers application | `wrangler.jsonc`, `package.json` |
| Authenticated ingestion | `src/server/ingest.ts` |
| Meaning and keyword search with combined rankings | `src/server/knowledge.ts` |
| OpenRouter generation and follow-up rewrites | `src/server/chat.ts`, `src/server/chat.config.ts` |
| Workers AI used for embeddings | `src/server/chat.config.ts` |
| Visitor-only contact checks | `src/server/contact-guard.ts`, `src/server/chat-tools.ts` |
| Delivery results separate from model promises | `src/server/chat.ts`, `src/server/chat-tools.ts`, `src/server/pushover.ts` |
| Versioned retrieval and first-question answer caching | `src/server/chat.config.ts`, `src/server/chat.ts` |
| Regression coverage | Existing retrieval, history, cache, provenance, pipeline, and notification suites |

The current config pins OpenRouter to `openai/gpt-5-mini`.
Public copy uses the provider name to avoid making a model release claim.
No live provider call occurs during this content repair.

## Checks and limits

Lint, TypeScript, and production build checks pass.
A static rendering check verifies the six-section format and absent source action.
The same check confirms Product Discovery AI retains its repository source action.
Current provider availability and notification delivery remain unverified.
Conversion, running cost, and answer quality need separate measurement.
No knowledge source changes. No ingestion is required for this page-only repair.
