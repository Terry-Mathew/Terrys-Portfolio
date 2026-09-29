// Capability groups and certifications. Split out of site.ts so the prose
// stays about who Terry is; this file is the machine-readable claim set that
// the Capabilities and Credentials sections render, and that the chatbot
// retrieves from src/content/knowledge/skills.md.

export const capabilityGroups = [
  {
    title: "Product",
    icon: "package",
    skills: [
      "Product Strategy",
      "Roadmapping",
      "User Research",
      "Cross-Functional Leadership",
      "Stakeholder Communication",
    ],
  },
  {
    title: "Data",
    icon: "chart",
    skills: ["SQL", "Analytics", "KPI Definition", "Data Pipelines", "Oracle Analytics Cloud"],
  },
  {
    title: "AI",
    icon: "brain",
    skills: [
      "Prompt Engineering",
      "Multi-Agent Systems",
      "RAG Architecture",
      "AI Prototyping",
      "AI Ethics & Bias",
    ],
  },
  {
    title: "Building",
    icon: "boxes",
    skills: ["Python", "CrewAI", "LangChain", "Supabase", "Vercel", "n8n"],
  },
] as const;

export interface Certification {
  name: string;
  year: string;
  issuer: string;
  /**
   * Single-glyph badge. These are third-party trademarks with no assets in
   * the repo, so the issuer is set in type rather than fetched as a logo.
   */
  mark: string;
  url: string;
}

export const certifications: Certification[] = [
  {
    name: "OCI 2025 — Certified Generative AI Professional",
    year: "2025",
    issuer: "Oracle",
    mark: "O",
    url: "https://catalog-education.oracle.com/ords/certview/sharebadge?id=03D675A81A08EFCE32B289138E5AFAD55C43E7E5BB0520ACBC150CC03CB350FF",
  },
  {
    name: "Oracle Fusion AI Agent Studio — Foundations Associate",
    year: "2025",
    issuer: "Oracle",
    mark: "O",
    url: "https://catalog-education.oracle.com/ords/certview/sharebadge?id=6C58CE6EBB603C223306F8261F4AE4E24AEBD4F6073C85F5E6FC9A48DC4E3D8C",
  },
  {
    name: "OCI 2025 — AI Foundations Associate",
    year: "2025",
    issuer: "Oracle",
    mark: "O",
    url: "https://catalog-education.oracle.com/ords/certview/sharebadge?id=38D8D33A0BF3B0859364C86B3B0AE63434BC4B24ADC9E5FCBF02284665BC5898",
  },
  {
    name: "Oracle APEX Cloud Certified Developer Professional",
    year: "2024",
    issuer: "Oracle",
    mark: "O",
    url: "https://catalog-education.oracle.com/ords/certview/sharebadge?id=9E5A56C1FB2B670C15AFDEA8708FF7C143C7352F06103EB70ABA69485BAA8BEB",
  },
  {
    name: "AI Engineer Agentic Track — Complete Agent & MCP Course",
    year: "2025",
    issuer: "Udemy",
    mark: "U",
    url: "https://www.udemy.com/certificate/UC-21ca774d-ebfb-4f8a-ac34-d40608e14ce7/",
  },
  {
    name: "Introduction to Generative AI",
    year: "2024",
    issuer: "Google Cloud",
    mark: "G",
    url: "https://www.coursera.org/account/accomplishments/verify/L8DDJ4YCMC74",
  },
  {
    name: "Introduction to Responsible AI",
    year: "2024",
    issuer: "Google Cloud",
    mark: "G",
    url: "https://www.coursera.org/account/accomplishments/verify/MTXKBRJ6LE79",
  },
  {
    name: "Digital Skills: User Experience",
    year: "2024",
    issuer: "Accenture",
    mark: ">",
    url: "https://www.futurelearn.com/certificates/ai3kc12",
  },
];
