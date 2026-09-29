// Single source of truth for the project system: the home grid, the /projects
// archive, and /projects/:projectId all read from this array.
//
// `featured` is an explicit flag rather than array order. Slicing by position
// silently demotes whichever project you add last, and the Digital Twin — the
// project this site is built around — was exactly the one that fell off.

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** Case-study fields. Optional: a personal project may have none. */
  problem?: string;
  approach?: string;
  challenges?: string;
  learnings?: string;
  outcomes?: string;
  tech: string[];
  github?: string;
  /** null or omitted hides the demo button. */
  youtube?: string | null;
  category: string;
  year: string;
  status: string;
  /** Shown in the home-page grid. */
  featured: boolean;
}

export const projects: Project[] = [
  {
    id: "digital-twin",
    title: "Digital Twin",
    subtitle: "AI persona for portfolio engagement and lead capture",
    description:
      "A serverless AI chatbot that answers visitor questions, qualifies leads and sends real-time notifications as a digital representative.",
    problem:
      "Static portfolios make visitors scan documents or wait for replies to specific questions. That gap between interest and contact creates friction and missed opportunities.",
    approach:
      "Built a serverless conversational assistant grounded in a curated biography and work history. Structured tools capture verified contact details and record unknown questions, while server-side guards, rate limiting and strict input handling reduce abuse and fabricated submissions.",
    challenges:
      "Early versions fabricated placeholder emails, free models failed on tool calls, and a raw forwarded-IP header could be spoofed. Deterministic email checks, a reliable model and trusted platform IP values corrected those weaknesses.",
    learnings:
      "For a small knowledge base, full context can be simpler and more accurate than retrieval. Deterministic server checks are stronger than prompt-only rules, and infrastructure-provided identity signals should replace client-controlled headers.",
    outcomes:
      "The assistant runs continuously, answers portfolio questions immediately and can notify Terry when a visitor provides verified contact details. The architecture remains inexpensive and security-conscious.",
    tech: [
      "React",
      "TypeScript",
      "Python",
      "DeepSeek",
      "OpenRouter",
      "Vercel Serverless",
      "Pushover API",
    ],
    github: "https://github.com/Terry-Mathew/Digital-Twin",
    youtube: "https://www.youtube.com/watch?v=rz2NKI9NG9U&t=352s",
    category: "AI Agents",
    year: "2025",
    status: "Live",
    featured: true,
  },
  {
    id: "product-discovery-ai",
    title: "Product Discovery AI",
    subtitle: "Multi-agent market research automation",
    description:
      "A CrewAI-powered system that automates end-to-end product discovery, from competitive intelligence to market sizing, using specialised AI agents.",
    problem:
      "Product managers and founders spend weeks researching competitors, mining customer pain points, sizing markets and synthesising findings before making go or no-go decisions. The process is slow, biased and often driven by instinct rather than structured analysis.",
    approach:
      "Built a multi-agent system with specialised roles for market landscape analysis, customer pain research, opportunity sizing, risk assessment, strategy synthesis and quality audit. Each agent uses an explicit framework and produces structured outputs for the final report.",
    challenges:
      "Generic prompts produced shallow analysis, so expert personas and explicit constraints were added. A quality-audit agent flags unsourced claims. The pipeline was also changed to collect every agent's output rather than only the final task.",
    learnings:
      "Expert framing produces stronger output than generic instructions. Explicit reasoning structures improve reliability. Triangulating across sources catches weak claims early, and a final quality gate is essential.",
    outcomes:
      "Reduced a multi-week discovery process to minutes. The system automates competitor research, customer-pain mining and market sizing, producing structured reports with risk analysis and practical roadmaps.",
    tech: ["CrewAI", "Python 3.12", "OpenAI GPT-4o", "Serper API", "Reddit API", "Gradio"],
    github: "https://github.com/Terry-Mathew/product-discovery-ai",
    youtube: "https://www.youtube.com/watch?v=w0kSLkXuY-E&t=64s",
    category: "AI Agents",
    year: "2025",
    status: "Working Prototype",
    featured: true,
  },
  {
    id: "settle",
    title: "Settle",
    subtitle: "A personal finance decision simulator",
    description:
      "It connects income, expenses, savings, debts, investments, assets, and planned purchases in one financial picture — helping people understand their current position and explore how a decision could affect it. Settle doesn't provide financial advice or tell people what to do. It helps them explore scenarios before making their own decisions.",
    tech: [],
    category: "Personal Finance",
    year: "Now",
    status: "In progress",
    featured: true,
  },
  {
    id: "deep-research-agent",
    title: "Deep Research Agent",
    subtitle: "Multi-agent orchestration for mastery-level research",
    description:
      "An autonomous research system that creates citation-backed reports through strategic planning, parallel retrieval and structured synthesis.",
    problem:
      "Language models rely on static training data and tend toward brief answers. Simple search pipelines also use narrow queries that miss the many dimensions of difficult topics. The goal was a system that actively investigates a question and produces a deep report without manual coordination.",
    approach:
      "Designed a three-stage pipeline: a planner breaks the topic into 12–15 search vectors, retrieval runs searches concurrently, and a writer synthesises the evidence into a structured report with summaries, comparisons and citations.",
    challenges:
      "Comprehensive research increased latency, so searches were parallelised. Search snippets lacked context, so an analyst pass filters noise before synthesis. Strict schemas and formatting rules keep large source sets coherent.",
    learnings:
      "Prompt structure is part of the architecture. Asynchronous execution is essential for usable agent workflows, and pre-processing evidence can produce better synthesis than sending everything directly to the final model.",
    outcomes:
      "Parallel execution cut the research stage dramatically. The system consistently produces detailed reports covering mechanisms, limitations and trends, with robust source handling and a clear interface.",
    tech: ["Python 3.10+", "OpenAI Agents SDK", "Serper.dev", "Pydantic", "Asyncio", "Gradio"],
    github: "https://github.com/Terry-Mathew/Deep-Research-Agent",
    youtube: null,
    category: "AI Agents",
    year: "2025",
    status: "In Development",
    featured: false,
  },
];

export const getProjectById = (id: string): Project | undefined =>
  projects.find((p) => p.id === id);

/** The home-page grid. Kept at three so it fills the 3-column layout exactly. */
export const featuredProjects = projects.filter((p) => p.featured);

export const prevProject = (id: string): Project | undefined => {
  const i = projects.findIndex((p) => p.id === id);
  return i > 0 ? projects[i - 1] : undefined;
};

export const nextProject = (id: string): Project | undefined => {
  const i = projects.findIndex((p) => p.id === id);
  return i >= 0 && i < projects.length - 1 ? projects[i + 1] : undefined;
};

/** Derived, so a new category can never drift out of the filter list. */
export const projectCategories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];

/** The case-study blocks, in reading order. Optional fields are skipped. */
export const CASE_STUDY_SECTIONS = [
  { key: "problem", label: "The problem" },
  { key: "approach", label: "The approach" },
  { key: "challenges", label: "Challenges" },
  { key: "learnings", label: "What I learned" },
  { key: "outcomes", label: "Outcomes" },
] as const satisfies readonly { key: keyof Project; label: string }[];

export const caseStudySections = (p: Project) =>
  CASE_STUDY_SECTIONS.filter(
    (s) => typeof p[s.key] === "string" && (p[s.key] as string).trim().length > 0,
  );
