// Single source of truth for the project system: the home grid, the /projects
// archive, and /projects/:projectId all read from this array.
//
// `featured` is an explicit flag rather than array order. Slicing by position
// silently demotes whichever project you add last, and the Digital Twin — the
// project this site is built around — was exactly the one that fell off.

export interface ProjectEvidence {
  title: string;
  summary: string;
  stages: { title: string; description: string }[];
  caption: string;
  decisions: { title: string; description: string }[];
  source?: string;
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** Case-study fields. Optional: a personal project may have none. */
  problem?: string;
  role?: string;
  approach?: string;
  challenges?: string;
  learnings?: string;
  outcomes?: string;
  evidence?: ProjectEvidence;
  progress?: boolean;
  illustration?: { src: string; webp: string; alt: string; caption: string };
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
    illustration: {
      src: "/project-art/digital-twin-1024.webp",
      webp: "/project-art/digital-twin-480.webp 480w, /project-art/digital-twin-1024.webp 1024w",
      alt: "Concept illustration: a layered paper portrait connected to three archive cards",
      caption:
        "Generated concept illustration. A portrait connected to source material represents the project's idea; this is not a product screen.",
    },
    title: "Digital Twin",
    subtitle: "A conversational introduction to my work",
    description:
      "The AI assistant built into this portfolio. It finds relevant passages from my knowledge base, answers visitor questions, and links answers to their sources.",
    problem:
      "Visitors arrive with different questions about my work. A hiring manager may want career context. A potential client may want to understand a project. I wanted a conversational way to find relevant information without making visitors search every section.",
    role: "I defined the product direction and designed the portfolio experience. I used AI-assisted development to build the interface, knowledge pipeline, and server safeguards. The work includes testing how the assistant finds evidence and handles contact requests.",
    approach:
      "The interface uses TanStack Start and React. Cloudflare Workers runs the application and API. Curated Markdown files provide career and project facts. An authenticated ingestion pipeline splits those files into passages. Vectorize searches by meaning. D1 searches by keywords. The server combines both rankings before preparing an answer.\n\nOpenRouter supplies answer generation. Workers AI creates search embeddings, not answers. The response streams into the chat interface with source links. Follow-up questions become standalone search queries so the conversation can retain its context.",
    challenges:
      "Finding a relevant document is not enough. The answer needs the matching passage, not unrelated text from the same document. Follow-up questions also need context before search.\n\nContact tools need a separate trust boundary. Server checks compare submitted contact details with visitor messages. Rate limits and duplicate checks reduce abuse. The assistant must not claim a successful contact action when delivery fails. These checks do not prove email ownership.",
    learnings:
      "Reliable answers depend on the whole path from source material to retrieval, generation, and presentation. Each stage needs its own checks.\n\nI separated answer generation from embeddings. I added an extractive fallback for provider failure. KV caches retrieval results and eligible first-question answers. Cache keys track knowledge and prompt versions so old answers do not silently survive content changes.",
    outcomes:
      "This codebase contains the portfolio chat interface, hybrid retrieval, streamed responses, source links, guarded tools, and versioned caching. Automated checks cover retrieval, conversation history, caching, and contact safeguards.\n\nThese code checks do not establish current provider availability, notification delivery, visitor conversion, or response quality in live use. Those outcomes need separate service checks and visitor feedback.",
    evidence: {
      title: "Find the evidence. Then write the answer.",
      summary:
        "The assistant separates source material, search, and response generation. This diagram explains the implementation in this portfolio codebase.",
      stages: [
        {
          title: "Curated knowledge",
          description:
            "Markdown facts become indexed passages through an authenticated ingestion pipeline.",
        },
        {
          title: "Hybrid search",
          description:
            "Vectorize matches meaning. D1 matches keywords. The server combines their rankings to select relevant passages.",
        },
        {
          title: "Grounded response",
          description:
            "OpenRouter writes the answer from selected context. The interface streams the response with source links. Guarded tools handle contact actions separately.",
        },
      ],
      caption:
        "Implementation diagram for this portfolio assistant. The generated artwork is conceptual; the diagram describes the code, not a measured live result.",
      decisions: [
        {
          title: "Evidence before generation",
          description:
            "Use selected passages instead of full documents. Combine meaning and keyword search so different question styles can find relevant facts.",
        },
        {
          title: "Checks outside the model",
          description:
            "Validate tool input on the server. Keep delivery results separate from model promises. Use fallback answers when generation is unavailable.",
        },
      ],
    },
    tech: [
      "TanStack Start",
      "React 19",
      "TypeScript",
      "Cloudflare Workers",
      "Vectorize",
      "D1",
      "KV",
      "Workers AI",
      "OpenRouter",
      "Pushover API",
    ],
    youtube: null,
    category: "AI Agents",
    year: "2026",
    status: "Portfolio assistant",
    featured: true,
  },
  {
    id: "product-discovery-ai",
    illustration: {
      src: "/project-art/product-discovery-1024.webp",
      webp: "/project-art/product-discovery-480.webp 480w, /project-art/product-discovery-1024.webp 1024w",
      alt: "Concept illustration: five layered paper research cards join through orange ribbons into one research brief",
      caption:
        "Generated concept illustration. Separate research cards combine into a brief; this is not a product screen or a real research result.",
    },
    evidence: {
      title: "Turn a product question into a structured research brief.",
      summary:
        "The public repository describes specialized research roles. This diagram explains that workflow; it is not a real research result.",
      stages: [
        {
          title: "Collect signals",
          description: "Research competitors and customer problems using search and Reddit tools.",
        },
        {
          title: "Challenge assumptions",
          description: "Sizing and risk roles examine the opportunity and its unknowns.",
        },
        {
          title: "Synthesize a brief",
          description: "Combine the research into a structured recommendation and roadmap.",
        },
      ],
      caption:
        "Explanatory workflow based on the public README. Generated reports still need independent source review.",
      decisions: [
        {
          title: "Separate the research roles",
          description:
            "Each role examines a different part of the product question before synthesis.",
        },
        {
          title: "Keep results open to review",
          description:
            "A structured report helps inspection. Structure alone does not prove that its claims or estimates are correct.",
        },
      ],
      source: "https://github.com/Terry-Mathew/product-discovery-ai",
    },
    title: "Product Discovery AI",
    subtitle: "Multi-agent market research automation",
    description:
      "A CrewAI-powered system that automates end-to-end product discovery, from competitive intelligence to market sizing, using specialised AI agents.",
    problem:
      "Product managers and founders spend weeks researching competitors, mining customer pain points, sizing markets and synthesising findings before making go or no-go decisions. The process is slow, biased and often driven by instinct rather than structured analysis.",
    approach:
      "The public project describes five roles: market landscape, customer pain, opportunity sizing, risk review, and strategy synthesis. A Gradio interface presents the research stages. Each stage contributes to the final report.",
    challenges:
      "Generic prompts produced shallow analysis, so expert personas and explicit constraints were added. A quality-audit agent flags unsourced claims. The pipeline was also changed to collect every agent's output rather than only the final task.",
    learnings:
      "Expert framing produces stronger output than generic instructions. Explicit reasoning structures improve reliability. Triangulating across sources catches weak claims early, and a final quality gate is essential.",
    outcomes:
      "The prototype organizes research into structured reports covering competitors, customer problems, market sizing, and risks. This case study does not establish measured time savings or report accuracy.",
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
    progress: true,
    illustration: {
      src: "/project-art/settle-1024.webp",
      webp: "/project-art/settle-480.webp 480w, /project-art/settle-1024.webp 1024w",
      alt: "Concept illustration: branching paths around a balanced charcoal sculpture",
      caption:
        "Generated concept illustration. Branching paths represent choices to explore; this is not a product screen or a forecast.",
    },
    problem:
      "Financial choices connect to more than one number. A purchase can affect savings, debt, and the room left for everyday costs.",
    approach:
      "Settle is an ongoing personal finance project. The intended experience connects a person's financial position with scenarios they can explore before making their own decision.",
    learnings:
      "A decision tool needs clear assumptions. A useful scenario explains its limits instead of presenting one outcome as a promise.",
    outcomes:
      "The project is in progress. This page describes its direction, not a completed product or measured user result. Product screens and release evidence will follow when available.",
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
      "The project explores parallel retrieval and structured report synthesis. This case study does not establish measured speed gains, citation accuracy, or production readiness.",
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
  { key: "role", label: "My role" },
  { key: "approach", label: "The approach" },
  { key: "challenges", label: "Challenges" },
  { key: "learnings", label: "What I learned" },
  { key: "outcomes", label: "Outcomes" },
] as const satisfies readonly { key: keyof Project; label: string }[];

export const caseStudySections = (p: Project) =>
  CASE_STUDY_SECTIONS.filter(
    (s) => typeof p[s.key] === "string" && (p[s.key] as string).trim().length > 0,
  );
