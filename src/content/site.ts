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
};

export const timeline = [
  {
    period: "2024–2026",
    title: "Senior Data Product Manager",
    org: "Partner Analytics",
    note: "Turned partner-program needs into analytics products that improved visibility into bookings, assessment activity, and incentive decisions.",
  },
  {
    period: "2023–2024",
    title: "Insights Analyst II",
    org: "Partner Insights and Revenue Operations",
    note: "Built partner and revenue reporting, then used the data to explain operational trends and support planning.",
  },
  {
    period: "2022–2023",
    title: "Business Operations Team Lead",
    org: "EMEA Operations",
    note: "Led the full opportunity-to-cash process, approved deal registrations, supported complex deals, and improved how the EMEA team handled transactions and exceptions.",
  },
  {
    period: "2021–2022",
    title: "Business Operations Specialist",
    org: "Partner Transactions",
    note: "Guided Sales through complex cloud deal setup, commercial terms, approvals, and booking handoffs.",
  },
  {
    period: "2018–2021",
    title: "Business Operations Analyst",
    org: "Partner Transactions",
    note: "Checked partner deal registrations and prepared quotes so eligible deals could move through Oracle’s sales process.",
  },
];

export const beforeOracle = ["HR", "IT Support", "Retail", "Hospitality"];

// Capability groups live in ./expertise and projects in ./projects. This file
// is deliberately only identity, career history and contact details.
