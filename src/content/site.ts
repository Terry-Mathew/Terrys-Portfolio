// Absolute origin for social share metadata. Set this to the final domain before
// launch — LinkedIn and X ignore relative og:image URLs and render no preview.
// Left empty, the head emits relative paths, which most crawlers still resolve
// against the page URL.
export const SITE_URL = "https://terrymathew.com";

export const profile = {
  name: "Terry Mathew",
  role: "Business intelligence, analytics, and operations",
  statement: "Hi, I’m Terry. My career has taken me through different industries, from business operations and team leadership to business intelligence and analytics.",
  background: "Along the way, I’ve developed an interest in technology, AI, and building things of my own.",
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
    note: "Led a 20-person EMEA team through quote-to-cash, approving deal registrations, supporting complex deals, and improving transaction handling.",
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
