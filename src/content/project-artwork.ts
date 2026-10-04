import researchArt from "@/assets/project-research.jpg";
import settleArt from "@/assets/project-settle.jpg";
import researchAvif480 from "@/assets/project-research-480w.avif";
import researchAvif1024 from "@/assets/project-research-1024w.avif";
import researchWebp480 from "@/assets/project-research-480w.webp";
import researchWebp1024 from "@/assets/project-research-1024w.webp";
import settleAvif480 from "@/assets/project-settle-480w.avif";
import settleAvif1024 from "@/assets/project-settle-1024w.avif";
import settleWebp480 from "@/assets/project-settle-480w.webp";
import settleWebp1024 from "@/assets/project-settle-1024w.webp";
import type { Project } from "./projects";

// Keyed by project id, not title — a rename in projects.ts must not silently
// drop the artwork.
const FALLBACK_ART = {
  src: settleArt,
  alt: "Abstract editorial artwork in warm tones",
  avif: `${settleAvif480} 480w, ${settleAvif1024} 1024w`,
  webp: `${settleWebp480} 480w, ${settleWebp1024} 1024w`,
} as const;

// Match the content grid: 1 column, 2 from 768px, 3 from 1280px.
// The container caps at 1500px. Account for section padding and grid gaps.
export const ART_SIZES =
  "(min-width: 98.75rem) 479px, (min-width: 80rem) calc((100vw - 9rem) / 3), (min-width: 48rem) calc((100vw - 7rem) / 2), calc(100vw - 2.5rem)";

const artwork: Record<string, { src: string; alt: string; avif?: string; webp: string }> = {
  settle: {
    src: settleArt,
    alt: "Abstract editorial artwork in warm tones",
    avif: FALLBACK_ART.avif,
    webp: FALLBACK_ART.webp,
  },
  "deep-research-agent": {
    src: researchArt,
    alt: "Editorial artwork in warm tones",
    avif: `${researchAvif480} 480w, ${researchAvif1024} 1024w`,
    webp: `${researchWebp480} 480w, ${researchWebp1024} 1024w`,
  },
};

export const projectArtwork = (project: Project) =>
  project.illustration ?? artwork[project.id] ?? FALLBACK_ART;
