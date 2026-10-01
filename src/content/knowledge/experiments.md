# Projects

Six projects Terry builds himself. Product direction and design are his; the
implementation is AI-assisted. Full case studies live at
terrymathew.com/projects.

## Digital Twin — live

The Digital Twin is the AI assistant running on terrymathew.com. It answers
questions about Terry's professional background, experience, projects, skills,
and interests, and it can capture a visitor's contact information so Terry can
follow up.

It is a TanStack Start application — React 19 and Vite — deployed to Cloudflare
Workers. Retrieval is hybrid: Cloudflare Vectorize provides semantic search over
768-dimension embeddings, Cloudflare D1 provides keyword search through SQLite
FTS5 with BM25 scoring, and the two rankings are merged with Reciprocal Rank
Fusion. Cloudflare KV caches retrieval results per question and complete answers
for self-contained first turns. The answer streams back to the browser over
server-sent events, so text appears as it is written rather than after the whole
reply is ready.

Follow-up questions are rewritten into standalone queries before retrieval, so
"how long was he a lead?" resolves the pronoun against the previous turn instead
of searching for the wrong words. Knowledge is loaded by an authenticated
ingestion endpoint that chunks each document, embeds it, writes the vectors,
stores the passage text, and reconciles anything left behind by deleted or
shortened files.

Two tools are guarded rather than exposed directly: one captures a visitor's
contact details, and one records a question the knowledge base could not answer.
Both validate before anything is stored or sent anywhere.

Generation runs on OpenRouter with a pinned Claude Sonnet 4.5, with Claude Haiku
4.5 handling the follow-up rewriting, and Groq as the fallback for both
generation and tool calling. Workers AI is used for embeddings only — it has a
daily free allowance, and one generated answer costs orders of magnitude more of
that allowance than one embedding does, so letting it write answers would stop
the knowledge base from being able to update itself.

A golden-set evaluation runs against the deployed chatbot after every release,
scoring real answers for required and forbidden content.

The project is both a portfolio experience and an experiment in building a
practical RAG system at bounded infrastructure cost.

## Product Discovery AI — working prototype

A multi-agent system for product discovery. Separate agents handle competitor
research, customer pain synthesis, opportunity sizing, risk assessment and
strategy synthesis, with a quality-audit step at the end to check the work
before it reaches a human.

The design problem was stopping several plausible-sounding agents from agreeing
with each other. The audit step exists because agents will happily produce a
well-structured report that is quietly wrong. The result compresses a multi-week
discovery process into minutes.

## Deep Research Agent — in development

An autonomous research system built on the OpenAI Agents SDK. A planning agent
breaks a topic into twelve to fifteen search directions, retrieval runs them
concurrently, and an analysis stage filters and organises the evidence before a
writing stage produces a structured, citation-backed report.

The two problems that shaped it were depth versus latency, which parallel
execution solved, and the snippet barrier — search APIs return fragments without
enough context, so an analyst pass filters noise before synthesis rather than
handing raw fragments to the writer.

## Settle — in progress

A personal finance decision simulator. Its central question is "what happens to
my money if I do this?" A user can model income, regular expenses, savings,
existing debt, EMIs, planned purchases, and other commitments, so a decision can
be seen over time rather than judged on the immediate monthly figure alone.

Settle is not financial advice and does not tell people what to do. It exists to
make the consequences of different scenarios easier to see before someone makes
a decision.

## Sales Outreach Agent — prototype

An experiment in LLM-assisted outbound communication. It combines generated
drafts with rules for tone, structure, and follow-up sequencing, exploring how
generative AI can assist outreach without being given complete control over the
messaging.

## Work Intelligence Assistant — prototype

An exploration of turning incoming work requests into structured next actions. It
classifies requests arriving through tools such as Slack, Outlook, and Jira into
trackable tasks, on the idea that work usually shows up as messages before it
becomes organised work.

## What these have in common

Each one is a workflow problem before it is a model problem. AI is used where
interpretation, synthesis, or generation is useful. Rules, structured data,
validation, and deterministic logic are used where consistency matters more than
creativity.

## Things worth asking

- "what is the digital twin"
- "how does the digital twin work"
- "what is settle"
- "what is the product discovery AI"
- "what is the deep research agent"
- "what side projects does he have"
- "what is he building outside work"
