# Projects

Four projects Terry builds himself. Product direction and design are his; the
implementation is AI-assisted. Full case studies live at terrymathew.com/projects.

## Digital Twin — live

The AI persona running on this site. It answers questions about Terry's
background, experience, projects and skills, and can capture a visitor's contact
details so he can follow up.

It is the project the rest of this site is built around, and it runs entirely on
Cloudflare's free tier: Workers for the API, Vectorize for semantic search, D1
for the document store and keyword index, KV for the answer cache, and Workers AI
for both embeddings and generation. Retrieval is hybrid — vector similarity
combined with BM25 keyword search, fused with Reciprocal Rank Fusion — and
follow-up questions are rewritten into standalone queries before retrieval, so
"how long was he a lead?" resolves the pronoun against the conversation.

## Product Discovery AI — working prototype

A multi-agent system for product discovery. Separate agents handle competitor
research, customer pain synthesis, opportunity sizing, risk assessment and
strategy synthesis, with a quality-audit step at the end to check the work before
it reaches a human.

The design problem was stopping several plausible-sounding agents from agreeing
with each other. The audit step exists because agents will happily produce a
well-structured report that is quietly wrong. The result compresses a multi-week
discovery process into minutes.

## Deep Research Agent — in development

An autonomous research system built on the OpenAI Agents SDK. A planner agent
breaks a topic into twelve to fifteen search vectors, retrieval runs them
concurrently, and a writer agent synthesises the evidence into a structured,
citation-backed report.

The two problems that shaped it were depth versus latency, which parallel
execution solved, and the snippet barrier — search APIs return fragments without
enough context, so an analyst pass filters noise before synthesis rather than
handing raw fragments to the writer.

## Settle — in progress

A personal finance decision simulator. It connects income, expenses, savings,
debts, investments, assets and planned purchases in one picture, so someone can
see what a commitment looks like over time before making it.

It exists because a loan or a large purchase is usually judged on the monthly
figure alone, and the monthly figure hides most of what determines whether the
commitment is survivable. Settle does not give financial advice or tell people
what to do — it helps them explore the scenarios first.

## What these have in common

Each one is a workflow problem before it is a model problem. The AI handles the
parts that need judgement and approximation; the rules and audits handle the
parts that must be correct and repeatable.

## Things worth asking

- "what is the digital twin"
- "what is settle"
- "what is the product discovery AI"
- "what is the deep research agent"
- "what side projects does he have"
- "what is he building outside work"
