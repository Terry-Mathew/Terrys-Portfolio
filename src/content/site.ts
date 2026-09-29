// Absolute origin for social share metadata. Set this to the final domain before
// launch — LinkedIn and X ignore relative og:image URLs and render no preview.
// Left empty, the head emits relative paths, which most crawlers still resolve
// against the page URL.
export const SITE_URL = "https://terrymathew.com";

export const profile = {
  name: "Terry Mathew",
  role: "Product, Data & AI Builder",
  statement:
    "I turn complex business problems into products, data systems and decision tools that people can actually use.",
  background:
    "8+ years across analytics, enterprise platforms and product management, with experience working across global teams, operations, finance and partner ecosystems.",
  pillars: ["Product Strategy", "Data Products", "AI Prototyping", "Analytics", "Business Systems"],
  email: "terry.perangat@gmail.com",
  linkedin: "https://www.linkedin.com/in/terry-mathew",
  instagram: "https://www.instagram.com/teddsy/",
  youtube: "https://www.youtube.com/@terrymathew-p",
  // Served from public/Terry-Mathew-CV.pdf — linked from Nav, Hero, Experience and Contact.
  resume: "/Terry-Mathew-CV.pdf",
};

export const caseStudies = [
  {
    index: "01",
    title: "Global Partner Systems",
    tags: "Product · Data · Workflow · Global",
    summary: "Turning fragmented partner operations into systems people could actually use.",
    problem: "Information lived across different systems, teams and regions.",
    role: "Product definition, workflow decisions, reporting, UAT and stakeholder alignment.",
    changed: "Created clearer operational structures and more consistent decision-making.",
  },
  {
    index: "02",
    title: "Trusted Partner Analytics",
    tags: "Data · Metrics · Governance",
    summary: "Getting many teams to agree on what the numbers actually mean.",
    problem: "Competing definitions meant every review started with arguing over the data.",
    role: "Metric design, data modelling decisions, validation and adoption across regions.",
    changed: "One shared model and vocabulary that reviews and planning could rely on.",
  },
  {
    index: "03",
    title: "From Reports to Decisions",
    tags: "Product · Insights · AI",
    summary: "Replacing report requests with tools built around the questions people ask.",
    problem: "Teams waited on manual reports to answer recurring, predictable questions.",
    role: "Discovery, prioritisation, prototype direction and rollout with business owners.",
    changed: "Self-serve answers for common questions and more time for the hard ones.",
  },
];

export const timeline = [
  {
    period: "2024–2026",
    title: "Senior Data Product Manager",
    org: "Partner Analytics",
    note: "Built reporting for partner programs, translated incentive policies into auditable logic, and shaped requirements for a credit management application.",
  },
  {
    period: "2023–2024",
    title: "Insights Analyst II",
    org: "Partner Insights and Revenue Operations",
    note: "Worked across deal registration, pipeline, bookings, and partner program reporting. Turned complex activity into information teams could use.",
  },
  {
    period: "2022–2023",
    title: "Business Operations Team Lead",
    org: "EMEA Operations",
    note: "Led a 20-person team handling more than 20,000 partner transactions each quarter. Changed the verification process, bringing average turnaround down from 20 days to 3–4.",
  },
  {
    period: "2021–2022",
    title: "Business Operations Specialist",
    org: "Partner Transactions",
    note: "Helped sales teams work through licensing, pricing, and approval questions, including complex deal exceptions.",
  },
  {
    period: "2018–2021",
    title: "Business Operations Analyst",
    org: "Partner Transactions",
    note: "Processed and checked partner deal registrations and approvals across EMEA and APAC.",
  },
];

export const beforeOracle = ["HR", "IT Support", "Retail", "Hospitality"];

export const capabilities = [
  {
    title: "Product",
    body: "Turning ambiguous problems into requirements, workflows, priorities and product decisions.",
    keywords: ["Product discovery", "PRDs", "Stakeholder alignment"],
  },
  {
    title: "Data",
    body: "Turning fragmented data into reliable information and decision systems.",
    keywords: ["Data products", "Analytics", "Metrics"],
  },
  {
    title: "AI",
    body: "Experimenting with AI for automation, interfaces and decision support.",
    keywords: ["AI prototypes", "Experimentation", "Evaluation"],
  },
  {
    title: "Systems",
    body: "Understanding where technology, process, incentives and people intersect.",
    keywords: ["Workflow design", "Business systems", "Governance"],
  },
];

export const experiments = [
  {
    name: "Settle",
    status: "Building",
    tagline: "Financial clarity before you commit.",
    body: "A decision simulator for money, debt, EMIs, savings and future purchases.",
    cta: "Explore Settle",
  },
  {
    name: "Jannanayak",
    status: "Experiment",
    tagline: "Making civic information easier to understand.",
    body: "Technology that helps people understand representation, public information and civic systems.",
    cta: "Explore Jannanayak",
  },
  {
    name: "Iconsherald",
    status: "Exploring",
    tagline: "People, ideas and the work they leave behind.",
    body: "A richer way to document people, institutions and meaningful contributions.",
    cta: "Explore Iconsherald",
  },
];
