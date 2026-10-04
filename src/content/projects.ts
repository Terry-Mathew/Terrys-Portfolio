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
    subtitle: "A portfolio assistant that answers with sources",
    description:
      "The assistant searches selected career and project information, then streams an answer with links to its sources. It gives visitors another way to explore my work.",
    problem:
      "Visitors may want different details about my work. A hiring team may look for role experience. A project client may want to understand how I approach a problem. I wanted visitors to find relevant information through a conversation.",
    role: "I defined the product direction and designed the portfolio experience. I used AI-assisted development to build the interface, knowledge pipeline, and server safeguards. The work includes testing how the assistant finds evidence and handles contact requests.",
    approach:
      "The assistant searches a curated knowledge base. Semantic search finds passages by meaning. Keyword search finds direct term matches. The server combines both result sets before sending selected evidence to the language model.\n\nThe interface streams the answer with source links. Follow-up questions are rewritten as standalone search queries, so the assistant can use conversation context during retrieval.",
    challenges:
      "The assistant needs the right passage, not only the right document. Follow-up questions also need context before search.\n\nContact actions need server-side checks. The assistant must report whether an action succeeds. Input checks do not prove that an email address belongs to the visitor.",
    learnings:
      "A reliable answer depends on every step from source material to retrieval and display. Each step needs its own checks.\n\nI separated search embeddings from answer generation. I added a fallback for generation failures and versioned caching, so content changes do not keep serving old answers.",
    outcomes:
      "The portfolio includes a chat interface, hybrid search, streamed answers, source links, guarded contact tools, and versioned caching. Automated checks cover retrieval, conversation history, caching, and contact safeguards.\n\nThese checks do not prove live answer quality, provider availability, notification delivery, or visitor conversion.",
    evidence: {
      title: "Find the evidence. Then write the answer.",
      summary:
        "The assistant separates source material, search, and answer generation. This diagram shows the implementation in this portfolio.",
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
        "This diagram shows the assistant implementation. The generated artwork is conceptual, not a product screen or a measured result.",
      decisions: [
        {
          title: "Evidence before generation",
          description:
            "Search selected passages. Combine semantic and keyword search so different question styles can find relevant facts.",
        },
        {
          title: "Checks outside the model",
          description:
            "Validate tool input on the server. Report delivery results accurately. Use a fallback when answer generation fails.",
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
      title: "Turn a product question into a research brief.",
      summary:
        "The workflow gathers signals, challenges assumptions, and combines findings. This diagram explains the project design, not a research result.",
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
        "This diagram explains the workflow. Generated reports need independent source review.",
      decisions: [
        {
          title: "Separate the research roles",
          description:
            "Each role examines a different part of the product question before synthesis.",
        },
        {
          title: "Keep results open to review",
          description:
            "A structured report helps people inspect the research. Its claims and estimates still need review.",
        },
      ],
      source: "https://github.com/Terry-Mathew/product-discovery-ai",
    },
    title: "Product Discovery AI",
    subtitle: "A structured workflow for early product research",
    description:
      "A multi-agent prototype that organizes competitor research, customer problems, market sizing, risk review, and strategy into a structured report.",
    problem:
      "Early product decisions need evidence about competitors, customer problems, market size, and risk. Collecting and combining that research can take time. A single research prompt can also miss important questions.",
    role:
      "I shaped the product direction and research workflow. I designed the system around separate research roles and a review step for the combined report.",
    approach:
      "The workflow separates research into five roles: market landscape, customer pain, opportunity sizing, risk review, and strategy synthesis. A Gradio interface presents the stages and their outputs.\n\nA quality-audit step flags claims that need stronger evidence. The report gives a structured view of the research for human review.",
    challenges:
      "Generic prompts produced shallow analysis. I added role-specific instructions and constraints. I also changed the pipeline to collect each role's output, so the final report could use more than the last result.",
    learnings:
      "Separate roles can broaden the questions a workflow examines. A review step can make weak evidence easier to spot. A structured report still needs a person to check its sources and conclusions.",
    outcomes:
      "The working prototype organizes research into reports about competitors, customer problems, opportunity size, and risks. The project has no verified measure of time saved or report accuracy. Reports need independent source review.",
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
      "A purchase can affect more than its monthly payment. It can change available savings, debt, and money left for regular expenses.",
    approach:
      "Settle is an in-progress personal finance scenario tool. The planned experience connects a person's financial information with choices they want to explore.",
    learnings:
      "A decision tool needs clear assumptions. A scenario should show its limits so people can judge the result for themselves.",
    outcomes:
      "Settle is in development. This case study describes the project direction. It does not claim a completed product or measured user result.",
    title: "Settle",
    subtitle: "A personal finance scenario tool in development",
    description:
      "Settle is designed to connect income, spending, savings, debt, and planned purchases. It will help people explore how a decision could affect their finances.",
    tech: [],
    category: "Personal Finance",
    year: "Now",
    status: "In progress",
    featured: true,
  },
  {
    id: "deep-research-agent",
    title: "Deep Research Agent",
    subtitle: "A research workflow for complex questions",
    description:
      "This project explores how planning, parallel search, evidence review, and structured writing can produce detailed research reports with citations.",
    problem:
      "Complex research questions can need several search paths. A single query may miss useful evidence. Search snippets may lack enough context for a strong report.",
    approach:
      "A planning stage divides a topic into search directions. Retrieval runs searches in parallel. An analysis stage filters and organizes the evidence before a writing stage creates a structured report with citations.",
    challenges:
      "More research can increase wait time. Parallel searches help manage that work. Search snippets can lack context, so the workflow includes an analysis stage before writing.",
    learnings:
      "The structure of the research prompt affects the result. Parallel retrieval can support broader research. Reviewing evidence before writing can help keep the report coherent.",
    outcomes:
      "The project explores parallel retrieval and structured report writing. It is in development. It has no verified measures for speed, citation accuracy, or production readiness.",
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
