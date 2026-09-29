# Projects Section - Content & Structure

## Overview
The Projects section exists in two places:
1. **Home page** — 4 featured project cards (grid, 2-col) linking to detail pages
2. **`/projects` page** — full list with category filter + case study previews
3. **`/projects/:projectId` page** — full case study detail (5 sections + tech stack)

All three read from a single source of truth: `src/data/projects.ts`.

## Data Structure (src/data/projects.ts)

```typescript
export interface Project {
    id: string;              // URL slug — /projects/:projectId
    title: string;
    subtitle: string;        // one-liner positioning
    description: string;     // 1-2 sentence summary for cards + SEO meta
    problem: string;         // long-form, supports \n and bullet "•"
    approach: string;
    challenges: string;
    learnings: string;
    outcomes: string;
    tech: string[];          // tech stack pills
    github: string;          // full URL
    youtube: string | null;  // null = hide Demo button
    category: string;        // must match a filter category
    year: string;
    status: string;          // e.g. 'Live', 'Working Prototype', 'Beta', 'In Development'
}
```

**Helper functions (same file):**
```typescript
export const getProjectById = (id: string): Project | undefined =>
    projects.find(project => project.id === id);

export const getFeaturedProjects = (count: number = 4): Project[] =>
    projects.slice(0, count);
```

---

## Full Project Content (5 projects)

### 1. Product Discovery AI
```typescript
{
    id: 'product-discovery-ai',
    title: 'Product Discovery AI',
    subtitle: 'Multi-agent market research automation',
    description: 'A CrewAI-powered system that automates the end-to-end product discovery process—from competitive intelligence to market sizing—using 7 specialized AI agents with distinct cognitive frameworks.',
    problem: 'Product managers and founders spend weeks manually researching competitors, mining Reddit for customer pain points, sizing markets, and synthesizing findings before making go/no-go decisions. This process is slow, biased, and often based on gut feelings rather than structured analysis.',
    approach: 'Built a multi-agent AI system using CrewAI that automates the end-to-end product discovery process. Created 7 specialized AI agents, each with a distinct persona and cognitive framework:

• Market Landscape Agent: Competitive Intelligence using MECE, Porter\'s Five Forces
• Customer Pain Agent: User Researcher using Pain Hierarchy (Surface → Existential)
• Opportunity Sizing Agent: VC Analyst using Bottoms-up TAM/SAM/SOM
• Risk Assessment Agent: Devil\'s Advocate using Pre-Mortem Analysis
• Strategy Synthesis Agent: CPO using Decision Framework (Proceed/Pivot/Stop)
• Quality Audit Agent: Fact-Checker using Hallucination Detection

Each agent uses Chain-of-Thought prompting with explicit step-by-step reasoning and structured Markdown outputs.',
    challenges: '• Prompt Engineering: Generic prompts produced shallow analysis. Had to inject expert personas, mental models, and explicit constraints.

• Hallucination Risk: LLMs would invent market data. Added a dedicated Quality Audit agent to flag unsourced claims.

• Output Fragmentation: CrewAI only returns the last task\'s output. Modified the pipeline to collect and compile all agent outputs.

• API Limitations: OpenAI embeddings required paid access. Refactored to work without memory/embeddings.',
    learnings: '• Persona > Instructions: "You are a Tier-1 Strategy Consultant" produces better output than "Analyze the market."

• Chain-of-Thought matters: Explicit "STEP 1, STEP 2, STEP 3" reasoning dramatically improves agent reliability.

• Triangulation beats volume: Validating insights across 3+ sources catches hallucinations early.

• Quality gates are essential: A dedicated QA agent at the end catches issues before delivery.',
    outcomes: '• Reduced product discovery from 2-3 weeks → 10 minutes
• Automated competitor research, Reddit pain mining, and market sizing
• Produces investor-grade reports with TAM/SAM/SOM, risk analysis, and 30/60/90 day roadmaps
• Built-in hallucination detection with quality scoring (A/B/C/D grades)',
    tech: ['CrewAI', 'Python 3.12', 'OpenAI GPT-4o', 'Serper API', 'Reddit API', 'Gradio'],
    github: 'https://github.com/Terry-Mathew/product-discovery-ai',
    youtube: 'https://www.youtube.com/watch?v=w0kSLkXuY-E&t=64s',
    category: 'AI Agents',
    year: '2025',
    status: 'Working Prototype'
}
```

### 2. Deep Research Agent
```typescript
{
    id: 'deep-research-agent',
    title: 'Deep Research Agent',
    subtitle: 'Multi-agent orchestration for mastery-level research',
    description: 'An autonomous AI research system using OpenAI Agents SDK that generates comprehensive, citation-backed reports through strategic planning, parallel retrieval, and structured synthesis.',
    problem: 'Large Language Models (LLMs) are powerful but suffer from inherent limitations: they operate on static training data (knowledge cutoffs) and exhibit a "brevity bias," defaulting to short, summarized responses rather than the deep, exhaustive analysis required for professional research. Furthermore, simple search-retrieval pipelines are often superficial; they rely on single, static queries that fail to cover the multidimensional aspects of complex topics. The challenge was to build an AI system that doesn\'t just answer a question, but actively investigates it, synthesizes vast amounts of real-time data, and produces a "mastery-level" report without human intervention.',
    approach: 'I architected a Multi-Agent Orchestration Pipeline using the OpenAI Agents SDK. The system operates in three distinct phases:

• Strategic Planning: An autonomous "Planner" agent deconstructs the user\'s topic into 12-15 diverse search vectors (covering definitions, mechanisms, limitations, and trends), ensuring no angle is overlooked.
• Parallel Retrieval: The system executes these searches concurrently using Python\'s asyncio.gather, drastically reducing latency compared to sequential execution.
• Synthesis & Structuring: A "Writer" agent, guided by strict constraint-based prompting, weaves the gathered data into a professional Markdown report complete with executive summaries, comparison tables, and citations.',
    challenges: '• Depth vs. Latency: Balancing the need for comprehensive research (15+ searches) with user experience (wait times). Solution: Implemented asynchronous parallel execution, reducing the research phase from ~30s to ~3s.

• The "Snippet" Barrier: Search APIs return short snippets, often lacking the context needed for deep analysis. Solution: Designed a multi-pass pipeline where a dedicated "Analyst" agent compresses and filters noise from snippets to extract maximum signal before passing data to the writer.

• Cloud Infrastructure Reliability: Deploying on Hugging Face Spaces introduced IP blocking issues with free search providers (DuckDuckGo). Solution: Migrated to Serper.dev (Google via API) to ensure 99.9% uptime and consistent data retrieval.

• Structuring Unstructured Data: Preventing the LLM from hallucinating or losing the narrative thread when synthesizing 10+ different sources. Solution: Enforced strict Pydantic schemas and formatting rules (Markdown tables, specific headers) to ensure structured, consistent output.',
    learnings: '• Prompt Engineering is Architecture: The "system prompt" is just as critical as the Python code. Simply asking for "detail" fails; the model requires explicit structural constraints (e.g., "Include a section on Limitations") to perform at a high level.

• Async is Essential for UX: In agentic workflows, blocking the main thread kills the user experience. Non-blocking parallelism is mandatory for scalability.

• Context Window Optimization: Throwing all data at the model isn\'t always the best approach. Pre-processing data with a summarizer agent improves the logical flow of the final report.',
    outcomes: '• High-Performance Research: Successfully reduced research time by 90% through parallel execution.

• Comprehensive Reporting: The system consistently generates detailed reports (1,500+ words) that cover technical mechanisms, pros/cons, and trends, far exceeding standard LLM chatbot capabilities.

• Reliability: Achieved a stable deployment on cloud infrastructure with robust error handling and API management.

• Professional UI: Delivered a clean, dark-mode interface via Gradio that clearly presents the agent\'s strategy, the final report, and source citations.',
    tech: ['Python 3.10+', 'OpenAI Agents SDK', 'Serper.dev', 'Pydantic', 'Asyncio', 'Gradio'],
    github: 'https://github.com/Terry-Mathew/Deep-Research-Agent',
    youtube: null,
    category: 'AI Agents',
    year: '2025',
    status: 'In Development'
}
```

### 3. Digital Twin
```typescript
{
    id: 'digital-twin',
    title: 'Digital Twin',
    subtitle: 'AI persona for portfolio engagement and lead capture',
    description: 'A serverless AI chatbot that acts as my 24/7 digital representative—answering visitor questions, qualifying leads, and sending real-time notifications. Currently live on this website.',
    problem: 'Static portfolios fail to engage visitors meaningfully. Recruiters have specific questions that require scanning PDFs or waiting for email replies. The gap between "interest" and "contact" leads to drop-off and missed opportunities.',
    approach: 'Built a serverless AI digital twin deployed on Vercel Functions using context injection—the full bio and experience is loaded into the system prompt on every call, grounding all responses in real data:

• Context Injection: Full bio and experience stuffed into the system prompt on every call, grounding all responses in real data without hallucination
• Tool Calling: Two structured functions—record_user_details captures visitor contact info and fires a real-time Pushover notification; record_unknown_question logs gaps for follow-up
• Server-Side Email Guard: validate_contact_email() verifies every email exists in the visitor\'s actual messages, blocking model-fabricated addresses like example.com before they trigger notifications
• Hardened System Prompt: Treats all visitor input as untrusted data; refuses role swaps, jailbreak attempts, and system prompt disclosure
• Edge Middleware: Rate limiting keyed on Vercel\'s trusted IP (not the spoofable x-forwarded-for header) prevents abuse before it hits the API
• Model: DeepSeek via OpenRouter—cheap, reliable, strong tool-calling support

The frontend is a custom React floating widget integrated directly into this portfolio.',
    challenges: '• Model Fabrication: The chatbot invented placeholder emails (e.g. terrystartup@example.com) and submitted them as real contact details, triggering false Pushover notifications. Fixed with a server-side guard that cross-checks the submitted email against everything the visitor actually typed.

• Free Model Failures: Switched to free OpenRouter models (Gemini Flash, Llama 3.3, Nemotron) in a fallback chain, but all three were rate-limited or lacked tool-calling support—every message returned an error. Replaced the chain with a single paid DeepSeek model for reliability.

• Rate Limiter Bypass: The Edge middleware read x-forwarded-for[0] for rate-limit keying, which is client-controlled on Vercel. An attacker could forge a new IP per request to bypass the limit. Fixed by switching to Vercel\'s trusted ipAddress() helper.

• Stateless Architecture: Serverless functions forget everything after each call. Solved by passing conversation history from the frontend on every request, sanitized server-side to strip injected roles.',
    learnings: '• Context Injection vs RAG: For a single-person knowledge base under 10KB, stuffing the full context beats RAG—simpler, faster, and more accurate with no retrieval errors.

• Server-Side Guards Beat Prompt Rules: Telling the model "don\'t fabricate emails" reduced hallucinations but didn\'t eliminate them. Deterministic server-side validation is the only reliable backstop.

• Model Choice Matters More Than Prompt Tuning: A code-generation model on a free tier produced unreliable tool calls regardless of how the prompt was written. Switching to a capable chat model fixed behavior without additional prompt engineering.

• Trusted Infrastructure Over Raw Headers: x-forwarded-for is attacker-controlled—never use it for security decisions. Always use platform-provided trusted values.',
    outcomes: '• Live in Production: Currently running on this portfolio at terrymathew.com
• Instant Lead Capture: Qualified contacts trigger Pushover notifications to my phone in <5 seconds with verified real email addresses
• Cost Efficient: Operates for <$1/month using DeepSeek via OpenRouter
• Security Hardened: Trusted-IP rate limiting, CORS allowlist, server-side email guard, and hardened prompt injection defences in place',
    tech: ['React', 'TypeScript', 'Python', 'DeepSeek', 'OpenRouter', 'Vercel Serverless', 'Edge Middleware', 'Pushover API'],
    github: 'https://github.com/Terry-Mathew/Digital-Twin',
    youtube: 'https://www.youtube.com/watch?v=rz2NKI9NG9U&t=352s',
    category: 'AI Agents',
    year: '2025',
    status: 'Live'
}
```

### 4. Sales Outreach Agent
```typescript
{
    id: 'sales-outreach-agent',
    title: 'Sales Outreach Agent',
    subtitle: 'Multi-persona email generation system',
    description: 'A hybrid AI + rule-based system for optimizing cold outreach campaigns. Generates personalized emails, tracks performance metrics, and provides actionable insights.',
    problem: 'Cold outreach is often generic and ineffective. Personalization at scale is challenging without automation, but pure AI-generated emails can sound robotic or off-brand. Sales teams waste time on low-quality outreach that damages brand reputation and yields poor results.',
    approach: 'Built a hybrid system combining AI generation with rule-based quality control:

• LLM generates personalized content based on prospect research (company news, role, industry)
• Rule-based scoring ensures brand voice consistency and catches common AI mistakes
• A/B testing framework for subject lines and messaging variants
• Analytics dashboard tracking opens, clicks, and responses
• Follow-up sequencing with customizable cadences and triggers',
    challenges: 'Avoiding the "uncanny valley" of AI-written emails — they need to feel personal but not creepy. Early versions included too much personal information, making recipients uncomfortable.

Solved this by:
• Limiting personalization signals to professional context (company news, role)
• Focusing on value proposition rather than personal details
• Adding human review step for high-value prospects',
    learnings: '• Prompt engineering for consistent brand voice is an art; small changes have big effects
• A/B testing reveals counterintuitive insights — shorter emails often outperform detailed ones
• Personalization beyond first name matters, but there\'s a line where it becomes creepy
• Compliance (CAN-SPAM, GDPR) must be built in from the start, not added later',
    outcomes: 'Working prototype demonstrating the generation and scoring pipeline. The hybrid approach — LLM generation plus rule-based brand-voice scoring — produces measurably more consistent outputs than a pure LLM approach. Not yet run as a live measured campaign.',
    tech: ['Python', 'OpenAI', 'Pandas', 'Streamlit', 'SMTP', 'Google Analytics', 'Apollo.io API'],
    github: 'https://github.com/Terry-Mathew/Sales-Outreach-Agent',
    youtube: null,
    category: 'Automation',
    year: '2025',
    status: 'Working Prototype'
}
```

### 5. rtios-next
```typescript
{
    id: 'rtios-next',
    title: 'rtios-next',
    subtitle: 'AI-powered job application platform',
    description: 'A full-stack platform that helps job seekers with intelligent briefing, interview coaching, resume analysis, and networking automation.',
    problem: 'Job searching is fragmented across multiple tools and platforms. Candidates struggle with preparation, tracking applications, and staying organized throughout the process. Each application requires research, customization, and follow-up — tasks that are repetitive but require attention to detail.',
    approach: 'Built a comprehensive platform with integrated AI-powered features:

• Resume analyzer with ATS optimization suggestions and keyword matching
• Company research aggregator with AI-powered summaries of news, culture, and interview experiences
• Mock interview coach with real-time feedback on responses, filler words, and clarity
• Application tracker with status updates and follow-up reminders
• Networking automation for LinkedIn outreach with personalized connection messages',
    challenges: 'Managing the complexity of multiple AI features while keeping the UI simple was the main challenge. Users are already stressed during job searches — adding cognitive load would be counterproductive.

Solved this by:
• Progressive disclosure — showing advanced features only when needed
• Clear feature grouping based on job search stage
• Sensible defaults that work for most cases',
    learnings: '• Full-stack development with Next.js is powerful but complex; the learning curve is steep
• Integrating multiple AI services requires careful error handling and graceful degradation
• User workflows must be intuitive — job seekers are already stressed and have low patience
• Data privacy is critical when handling resumes and personal info; security can\'t be an afterthought',
    outcomes: 'Beta users reported 40% faster application preparation time. Improved interview confidence scores based on self-assessment. Users particularly valued the company research aggregation feature.',
    tech: ['Next.js', 'TypeScript', 'OpenAI', 'PostgreSQL', 'Prisma', 'Tailwind CSS', 'Vercel', 'Clerk Auth'],
    github: 'https://github.com/Terry-Mathew/rtios-next',
    youtube: null,
    category: 'Full Stack',
    year: '2025',
    status: 'Beta'
}
```

---

## Home Page Projects Grid (Home.tsx lines 524-574)

Shows `getFeaturedProjects(4)` — i.e. the **first 4** projects in the array.

```tsx
<div className="projects-grid grid md:grid-cols-2 gap-6">
  {projects.map((project) => (
    <div
      key={project.id}
      onClick={() => navigate(`/projects/${project.id}`)}
      className="project-card card-elevated p-6 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="tag font-mono text-xs">{project.category}</span>
        <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="text-title text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1">
        {project.title}
      </h3>
      <p className="text-sm text-[var(--color-accent)] mb-3">{project.subtitle}</p>
      <p className="text-body text-sm mb-4 line-clamp-2">{project.description}</p>
      <div className="flex flex-wrap gap-2">
        {project.tech.map((tech, i) => (
          <span key={i} className="tag text-xs">{tech}</span>
        ))}
      </div>
    </div>
  ))}
</div>
```

**Important:** `getFeaturedProjects` uses `slice(0, count)` — there is no `featured` flag. Adding a 6th project will NOT change the home page until you either add a `featured: boolean` field or reorder the array.

---

## `/projects` Index Page (Projects.tsx)

**Filter categories (hardcoded, line 80):**
```typescript
const categories = ['All', 'AI Agents', 'Automation', 'Full Stack'];
```
Filter logic (lines 82-84):
```typescript
const filteredProjects = activeFilter === 'All'
  ? projects
  : projects.filter(p => p.category === activeFilter);
```

**Card layout:** horizontal card with:
- Header: category tag + year + title + subtitle
- Description (full, not clamped)
- "CASE STUDY PREVIEW" nested card with 3 columns: Problem / Approach / Key Learning (each `line-clamp-3`)
- Footer: first 5 tech tags + `+N` overflow, GitHub link, Demo link (if `youtube`)

---

## `/projects/:projectId` Detail Page (ProjectDetail.tsx)

**5 case study sections** defined at lines 104-140:

| id | title | icon | color |
|----|-------|------|-------|
| `problem` | Problem | `Target` | red |
| `approach` | Approach | `Compass` | blue |
| `challenges` | Key Challenges | `AlertTriangle` | amber |
| `learnings` | Key Learnings | `Lightbulb` | green |
| `outcomes` | Outcomes | `TrendingUp` | purple |

**Content rendering (line 219):** uses `whitespace-pre-line`, so `\n` inside the data strings becomes line breaks. This is how the `•` bullet lists render.

**Header meta tags:** `category` tag, `year` label, `status` in `tag tag-accent`.

**Tech Stack block:** dark card (`bg-[#1A1A1A] dark:bg-[#0D0D0B]`) with all `tech` items as white pills.

**Not-found handling (lines 88-102):** renders "Project not found" screen with back button.

**SEO (lines 31-37):** dynamic per project — `title`, `description`, `keywords`, `url`, `type: 'article'`.

---

## Migration Checklist

- [ ] Copy `src/data/projects.ts` verbatim (single source of truth)
- [ ] Decide on `featured` flag vs array-order slicing for home page
- [ ] Recreate `Project` interface (or convert to MDX/Content Collections)
- [ ] Home grid: 2-col, click → navigate to detail
- [ ] Index page: hardcoded filter list must match `category` values exactly
- [ ] Detail page: `whitespace-pre-line` on long-form content (essential — data has `\n` + `•`)
- [ ] Preserve `youtube: null` conditional (hide Demo button)
- [ ] Preserve not-found state
- [ ] Port per-project SEO
- [ ] Consider `status` values as a filter in the new site (Live / Beta / Working Prototype / In Development)