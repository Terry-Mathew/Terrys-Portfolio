# Projects

Four personal projects. Product direction and design are Terry's; implementation
is AI-assisted. Demos and code live at terrymathew.com.

## Digital Twin

A serverless AI persona on the portfolio site. It answers questions about Terry's
background, qualifies leads, and sends real-time notifications.

This is the project the rest of this site is built around. It runs entirely on
Cloudflare's free tier: Workers for the API, Vectorize for semantic search, D1
for the document store and keyword index, KV for the answer cache, and Workers AI
for both embeddings and generation. Retrieval is hybrid — vector similarity
combined with BM25 keyword search, fused with Reciprocal Rank Fusion — and
follow-up questions are rewritten into standalone queries before retrieval so
that "how long was he a lead?" resolves the pronoun against the conversation.

## Product Discovery AI

A multi-agent system for product discovery. Separate agents handle competitor
research, customer pain synthesis, and market sizing, with a quality-audit step
at the end to check the work before it reaches a human.

The design problem was stopping five plausible-sounding agents from agreeing with
each other. The audit step exists because agents will happily produce a
well-structured report that is quietly wrong.

## Sales Outreach Agent

LLM-assisted drafting for sales outreach, with rule-based tone checks and
follow-up sequencing.

The rule-based layer is the interesting part. Tone checks are deterministic
because tone is the kind of thing that should fail loudly, not drift depending on
sampling temperature.

## Work Intelligence Assistant

Classifies approved requests arriving through Slack, Outlook, and Jira into
trackable next actions. It exists because a request that arrives in three
channels is a request nobody owns.

## What these have in common

Each one is a workflow problem before it is a model problem. The AI handles the
parts that need judgement and approximation; the rules and audits handle the
parts that must be correct and repeatable.
