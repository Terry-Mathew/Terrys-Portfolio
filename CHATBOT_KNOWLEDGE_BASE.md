# Chatbot Knowledge Base — RAG-Ready Chunks

The current `api/data/me.txt` is one flat file stuffed into the system prompt. For RAG this needs
to become discrete, self-contained, heading-prefixed chunks. Content below is faithful to
`api/data/me.txt` (the source the chatbot reads today) — reorganized for retrieval.

**Format per chunk:** heading prepended, then `---`, then body. Embed the whole chunk including
the heading. ~21 chunks.

---

## Chunk 1 — about / who
```text
About Terry Mathew — Who I Am
---
I'm Terry Mathew, a Senior Data Product Manager at Oracle Corporation based in Bangalore, India. I spent eight years at Oracle progressing from managing global operations to owning full-stack product delivery. I design data pipelines, build dashboards, and develop reporting layers that serve a global partner ecosystem. My background in hospitality, retail, and technical support shapes my approach to building intuitive, high-utility products. Outside my core role, I build AI-powered applications using agentic frameworks — automating workflows, creating digital personas, and experimenting with multi-agent systems.
```

## Chunk 2 — career / before oracle
```text
Career — Before Oracle
---
Four Seasons (F&B Shift Leader) → Bose (Store In Charge, Retail) → IBM (Technical Support) → Amazon (HR Shared Services) → Oracle (2018). Each step added a layer: service, operations, data, analytics, product. The hospitality and retail years built the business-user empathy that now underpins my approach to building products people actually adopt.
```

## Chunk 3 — role / senior data product manager
```text
Role — Senior Data Product Manager, Oracle (Mar 2024 – Present)
---
- Co-own roadmap and delivery for an internal credit management platform — from discovery and requirements through UAT and launch
- Built the end-to-end reporting layer using Oracle APEX, serving 40+ business users
- Built a unified analytics platform combining four data sources into a single lifecycle-tracking view for the partner assessment program
- Recognition: Champion of the Quarter, FY25 Q2
```

## Chunk 4 — role / insights analyst
```text
Role — Insights Analyst II, Oracle (Mar 2023 – Mar 2024)
---
- Built partner deal registration dashboard serving 50+ users with 20,000+ monthly queries
- Built ETL pipelines and dashboards on Oracle Analytics Cloud for EMEA, APAC, and Americas
- SME for partner data and CPQ systems
- Recognition: Employee of the Quarter, FY23 Q3
```

## Chunk 5 — role / business ops team lead
```text
Role — Business Operations Team Lead, Oracle (Feb 2022 – Mar 2023)
---
- Led 20-member team managing 20,000+ tickets per quarter across EMEA
- Reduced manual effort by 25% through process optimisation
- Improved team retention by 80% through structured onboarding
```

## Chunk 6 — role / business ops specialist + analyst
```text
Role — Business Operations Specialist (Jul 2021 – Feb 2022) and Business Operations Analyst (May 2018 – Jul 2021), Oracle
---
Business Operations Specialist:
- Processed 300+ quotes and approvals annually with 99.5% accuracy for $50M+ partner deals
- Authored 15+ SOPs ensuring 100% compliance

Business Operations Analyst:
- Structured complex cloud, license, and hardware deals
- Built expertise in CPQ systems and partner deal structures
```

## Chunk 7 — project / product discovery ai
```text
Project — Product Discovery AI | Multi-agent market research automation | 2025 | Working Prototype
---
A CrewAI-powered system that automates end-to-end product discovery using 7 specialised AI agents: Market Landscape, Customer Pain, Opportunity Sizing, Risk Assessment, Strategy Synthesis, and a Quality Audit agent for hallucination detection. Each agent uses Chain-of-Thought prompting. Reduces discovery from weeks to ~10 minutes. Produces investor-grade reports with TAM/SAM/SOM and 30/60/90 day roadmaps.
Tech: CrewAI, Python 3.12, OpenAI GPT-4o, Serper API, Reddit API, Gradio
GitHub: github.com/Terry-Mathew/product-discovery-ai
```

## Chunk 8 — project / deep research agent
```text
Project — Deep Research Agent | Multi-agent orchestration for mastery-level research | 2025 | In Development
---
An autonomous AI research system using OpenAI Agents SDK. A Planner agent deconstructs a topic into 12–15 search vectors, parallel asyncio execution retrieves them concurrently (~3s vs ~30s sequential), and a Writer agent synthesises a structured Markdown report with citations. Generates 1,500+ word reports covering mechanisms, pros/cons, and trends.
Tech: Python 3.10+, OpenAI Agents SDK, Serper.dev, Pydantic, Asyncio, Gradio
GitHub: github.com/Terry-Mathew/Deep-Research-Agent
```

## Chunk 9 — project / digital twin
```text
Project — Digital Twin | AI persona for portfolio engagement and lead capture | 2025 | Live
---
A serverless AI chatbot acting as my 24/7 digital representative. Architecture: the full bio is loaded into the system prompt on every call (context injection, not RAG — simpler and more accurate for a single-person knowledge base under 10KB). Two tool functions handle lead capture: record_user_details fires a real-time Pushover notification to my phone; record_unknown_question logs gaps. Server-side email validation blocks model-fabricated addresses. Edge middleware handles rate limiting using Vercel's trusted IP. Frontend is a custom React floating widget.
Tech: React, TypeScript, Python, DeepSeek (via OpenRouter), Vercel Serverless, Edge Middleware, Pushover API
GitHub: github.com/Terry-Mathew/Digital-Twin
```

## Chunk 10 — project / sales outreach agent
```text
Project — Sales Outreach Agent | Multi-persona email generation system | 2025 | Working Prototype
---
A hybrid AI + rule-based system for cold outreach. LLM generates personalised content; rule-based scoring enforces brand voice consistency and catches common AI mistakes. The hybrid approach — LLM generation plus explicit rule-based scoring — produces more consistent outputs than a pure LLM approach. Working prototype, not a live measured campaign.
Tech: Python, OpenAI, Pandas, Streamlit, SMTP
GitHub: github.com/Terry-Mathew/Sales-Outreach-Agent
```

## Chunk 11 — project / rtios-next
```text
Project — rtios-next | AI-powered job application platform | 2025 | Beta
---
Full-stack platform helping job seekers with resume analysis, mock interview coaching, company research aggregation, application tracking, and LinkedIn outreach automation. Beta users reported 40% faster application prep.
Tech: Next.js, TypeScript, OpenAI, PostgreSQL, Prisma, Tailwind CSS, Vercel, Clerk Auth
GitHub: github.com/Terry-Mathew/rtios-next
```

## Chunk 12 — skills / product management
```text
Skills — Product Management
---
Product Strategy & Roadmapping, Cross-Functional Leadership, Agile/Scrum, User Research & Discovery, Stakeholder Communication, Go-to-Market Planning, A/B Testing
```

## Chunk 13 — skills / data & analytics
```text
Skills — Data & Analytics
---
SQL (Intermediate), Data Pipelines, Python, Power BI, Oracle Analytics Cloud, KPI Definition & Tracking
```

## Chunk 14 — skills / ai expertise
```text
Skills — AI Expertise
---
LLM & Prompt Engineering, RAG Architecture, Multi-Agent Systems, ML Fundamentals, Vector Databases, AI Ethics & Bias
```

## Chunk 15 — skills / ai development tools
```text
Skills — AI Development Tools
---
Cursor, Replit, Lovable.dev, Bolt.new, LangChain, CrewAI, n8n, Zapier, Make, Supabase, Vercel
```

## Chunk 16 — certifications
```text
Certifications
---
- OCI 2025 — Certified Generative AI Professional (Oracle, 2025)
- Oracle Fusion AI Agent Studio — Foundations Associate (Oracle, 2025)
- OCI 2025 — AI Foundations Associate (Oracle, 2025)
- Oracle APEX Cloud Certified Developer Professional (Oracle, 2024)
- AI Engineer Agentic Track — Complete Agent & MCP Course (Udemy, 2025)
- Introduction to Generative AI (Google Cloud, 2024)
- Introduction to Responsible AI (Google Cloud, 2024)
- Digital Skills: User Experience (Accenture, 2024)
```

## Chunk 17 — education
```text
Education
---
- Post Graduate Diploma in Business Administration — Indo-German Chamber of Commerce (IGCC), Bangalore (2014–2015)
- B.Sc. in Hospitality & Hotel Administration — Institute of Hotel Management & Catering Technology, Trivandrum (2006–2009)
```

## Chunk 18 — contact & links
```text
Contact & Links
---
- Email: terry.perangat@gmail.com
- LinkedIn: linkedin.com/in/terry-mathew
- GitHub: github.com/Terry-Mathew
- Substack: substack.com/@terrymathew
- Website: terrymathew.com
- Location: Bangalore, India
```

## Chunk 19 — languages
```text
Languages
---
English (Fluent), Hindi (Fluent), Malayalam (Native), German (A1)
```

## Chunk 20 — how technical am i
```text
On AI Projects & How Technical I Am
---
I design the architecture and direct the build — I understand why every piece is there and can make product decisions about it. The implementation code is AI-assisted. I'm upfront about that. I built these projects so that when I make decisions about AI features, I'm not guessing — I know what RAG can and can't do, why hallucination is a product risk, what a multi-agent setup actually buys you. I won't bluff below that line.
```

## Chunk 21 — what he's looking for
```text
What I'm Looking For
---
Senior Product Manager roles focused on data or AI products, Technical PM in the AI/ML space, or roles building products that leverage LLMs and agentic architectures.
```

---

## Ingestion Notes

**Metadata per chunk** (attach at vectorize time):
| chunk | `type` | `id` | `title` |
|-------|--------|------|---------|
| 1 | about | about | About Terry Mathew |
| 2 | career | before-oracle | Career Before Oracle |
| 3-6 | role | senior-dpm / insights-analyst / ops-lead / ops-specialist-analyst | role title |
| 7-11 | project | product-discovery-ai / deep-research-agent / digital-twin / sales-outreach-agent / rtios-next | project title |
| 12-15 | skill | product-management / data-analytics / ai-expertise / ai-dev-tools | category |
| 16 | certification | certifications | Certifications |
| 17 | education | education | Education |
| 18 | contact | contact | Contact & Links |
| 19 | about | languages | Languages |
| 20 | about | technical-depth | How Technical I Am |
| 21 | about | looking-for | What I'm Looking For |

Also add `year` for chunks 3-11 and `status` for chunks 7-11 so you can filter
("what are my live projects?") without a semantic search.

**Embedding model dimension must match the Vectorize index `dimensions` setting.** Common pairing:
`@cf/baai-base-embedding-v1.5` → 768 dimensions.

**Retrieval settings:** `top_k = 6`, `neighbors = 0` (no overlap needed — chunks are self-contained),
`threshold` around 0.3 for cosine if you want to drop weak matches. If a query returns nothing
above threshold, the model should say it doesn't know and call `record_unknown_question` rather than
guessing — that behaviour is already in the system prompt.

**Never index tool output or `record_unknown_question` logs automatically.** If you later add
reviewed questions to the corpus, that's a stored prompt-injection vector. See
`CLOUDFLARE_MIGRATION.md` §10.
