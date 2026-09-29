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
  instagram: "https://www.instagram.com/tedssy/",
  youtube: "https://www.youtube.com/@terrymathew-p",
  // Served from public/Terry-Mathew-CV.pdf — linked from Nav, Hero, Experience and Contact.
  resume: "/Terry-Mathew-CV.pdf",
};

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

// Capability groups live in ./expertise and projects in ./projects. This file
// is deliberately only identity, career history and contact details.
