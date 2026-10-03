---
title: Terry Mathew — Projects
type: personal_projects
priority: 95
updated: 2026-10
aliases:
  - side projects
  - AI projects
  - portfolio projects
  - what is Terry building
  - digital twin
  - Settle
  - Product Discovery AI
  - Deep Research Agent
---

# Terry Mathew — Personal Projects

Terry builds independent projects to explore product ideas, data systems, and applied AI.

He defines the product direction and design himself and uses AI-assisted development where useful.

## Digital Twin

### Status: Live

The Digital Twin is the AI assistant running on terrymathew.com.

It answers questions about Terry's professional background, experience, projects, skills, and interests.

It can also capture a visitor's contact information for follow-up.

The application is built with TanStack Start, React 19 and Vite, and is deployed to Cloudflare Workers.

Its architecture uses Workers for the application and API layer, Vectorize for semantic retrieval, D1 for document and keyword data, and KV for caching.

Retrieval combines semantic vector search with BM25 keyword retrieval.

The results are combined using Reciprocal Rank Fusion.

The embeddings are 768-dimensional, and Workers AI is used for those embeddings only. It does not write answers.

OpenRouter writes answers with the pinned `openai/gpt-5-mini` model. The same model rewrites follow-up questions and handles tool calls. If OpenRouter fails, the chatbot uses its extractive fallback.

The answer is streamed back to the browser over server-sent events, so the text appears while it is being written rather than appearing all at once at the end.

Follow-up questions are rewritten into standalone search queries before retrieval so that conversational references such as "how long was he a lead?" can be resolved using the previous conversation.

Knowledge is loaded through an authenticated ingestion endpoint that chunks each document, embeds it, writes the vectors, stores the passage text, and removes anything left behind by files that were deleted or shortened.

Two tools are guarded rather than exposed directly to the model: one captures a visitor's contact details, and one records a question the knowledge base could not answer. Both validate their input before anything is stored or sent anywhere.

Retrieval results and complete answers for self-contained first questions are cached in KV.

A golden set of real questions is scored against the deployed chatbot after each release, covering both retrieval and conversation behaviour.

The project is both a portfolio experience and an experiment in building a practical RAG system with limited infrastructure cost.

## Product Discovery AI

### Status: Working prototype

Product Discovery AI is a multi-agent system designed to support early product discovery.

Different agents handle tasks such as competitor research, customer-pain synthesis, opportunity sizing, risk analysis, and strategy synthesis.

A separate quality-audit step reviews the combined output before it is presented to the user.

One of the main design problems was preventing multiple agents from simply reinforcing one another's assumptions.

The audit stage exists to challenge unsupported claims, inconsistencies, and weak evidence before the final output reaches a human.

## Deep Research Agent

### Status: In development

The Deep Research Agent is an autonomous research workflow built around the OpenAI Agents SDK.

A planning agent decomposes a research topic into multiple search directions.

Retrieval tasks can then run in parallel.

An analysis stage filters and organises the evidence before a writing stage produces a structured, citation-backed report.

The project explores the trade-off between research depth, latency, source quality, and synthesis.

## Settle

### Status: In progress

Settle is a personal-finance decision simulator.

Its central question is:

"What happens to my money if I do this?"

A user can model income, regular expenses, savings, existing debt, EMIs, planned purchases, and other commitments.

Settle is designed to show how a decision affects future monthly cash flow rather than looking only at the immediate monthly EMI or purchase price.

Planned capabilities include debt payoff projections, prepayment scenarios, savings projections, recurring and irregular expenses, planned purchases, travel spending, and credit-card commitments.

Settle is not intended to provide financial advice.

Its role is to make the consequences of different scenarios easier to see before someone makes a decision.

## Sales Outreach Agent

### Status: Prototype

The Sales Outreach Agent experiments with LLM-assisted outbound communication.

It combines generated drafts with rules for tone, structure, and follow-up sequencing.

The purpose is to explore how generative AI can assist outreach without giving the model complete control over messaging.

## Work Intelligence Assistant

### Status: Prototype

The Work Intelligence Assistant explores how incoming work requests can be converted into structured next actions.

The concept classifies requests from tools such as Slack, Outlook, and Jira into trackable tasks or actions.

It is designed around the idea that work often arrives as messages before it becomes organised work.

## What the projects have in common

Most of Terry's projects start with a workflow or decision problem rather than with a particular AI model.

AI is used where interpretation, synthesis, or generation is useful.

Rules, structured data, validation, and deterministic logic are used where consistency matters more than creativity.
