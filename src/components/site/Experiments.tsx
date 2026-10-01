import discoveryArt from "@/assets/project-discovery.jpg";
import researchArt from "@/assets/project-research.jpg";
import settleArt from "@/assets/project-settle.jpg";
import discoveryAvif480 from "@/assets/project-discovery-480w.avif";
import discoveryAvif1024 from "@/assets/project-discovery-1024w.avif";
import discoveryWebp480 from "@/assets/project-discovery-480w.webp";
import discoveryWebp1024 from "@/assets/project-discovery-1024w.webp";
import researchAvif480 from "@/assets/project-research-480w.avif";
import researchAvif1024 from "@/assets/project-research-1024w.avif";
import researchWebp480 from "@/assets/project-research-480w.webp";
import researchWebp1024 from "@/assets/project-research-1024w.webp";
import settleAvif480 from "@/assets/project-settle-480w.avif";
import settleAvif1024 from "@/assets/project-settle-1024w.avif";
import settleWebp480 from "@/assets/project-settle-480w.webp";
import settleWebp1024 from "@/assets/project-settle-1024w.webp";
import { featuredProjects, type Project } from "@/content/projects";
import { Reveal, SectionLabel } from "./Reveal";
import { Picture } from "./Picture";

// Keyed by project id, not title — a rename in projects.ts must not silently
// drop the artwork.
const FALLBACK_ART = {
  src: settleArt,
  alt: "Abstract editorial artwork in warm tones",
  avif: `${settleAvif480} 480w, ${settleAvif1024} 1024w`,
  webp: `${settleWebp480} 480w, ${settleWebp1024} 1024w`,
} as const;

// Measured: 432px at 1440, 335px at 375, 208px at 768 in the 3-column grid.
const ART_SIZES =
  "(min-width: 80rem) 432px, (min-width: 64rem) 30vw, (min-width: 48rem) 45vw, 92vw";

const artwork: Record<string, { src: string; alt: string; avif: string; webp: string }> = {
  settle: {
    src: settleArt,
    alt: "Abstract editorial artwork in warm tones",
    avif: FALLBACK_ART.avif,
    webp: FALLBACK_ART.webp,
  },
  "product-discovery-ai": {
    src: discoveryArt,
    alt: "Editorial artwork in warm tones",
    avif: `${discoveryAvif480} 480w, ${discoveryAvif1024} 1024w`,
    webp: `${discoveryWebp480} 480w, ${discoveryWebp1024} 1024w`,
  },
  "deep-research-agent": {
    src: researchArt,
    alt: "Editorial artwork in warm tones",
    avif: `${researchAvif480} 480w, ${researchAvif1024} 1024w`,
    webp: `${researchWebp480} 480w, ${researchWebp1024} 1024w`,
  },
};

const projectArtwork = (id: string) => artwork[id] ?? FALLBACK_ART;

/** The home-page card. Shared shape with the /projects archive entries. */
export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const art = projectArtwork(project.id);
  return (
    <Reveal as="article" key={project.id} delay={index * 100}>
      <a
        href={`/projects/${project.id}`}
        className="photo-zoom group relative block h-full overflow-hidden bg-paper-2 transition-transform duration-500 hover:-translate-y-1.5"
      >
        <Picture
          avif={art.avif}
          webp={art.webp}
          fallback={art.src}
          alt={art.alt}
          width={1024}
          height={768}
          sizes={ART_SIZES}
          loading="lazy"
          className="h-[24rem] w-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-paper-2 via-paper-2/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-7">
          <p className="label-eyebrow text-ember-ink">
            0{index + 1} · {project.status}
          </p>
          <h3 className="display-xl mt-3 text-3xl text-graphite">{project.title}</h3>
          <p className="mt-3 font-editorial text-lg text-graphite">{project.subtitle}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-graphite-dim">
            {project.description}
          </p>
          <span className="link-arrow label-eyebrow mt-6 inline-flex text-graphite">
            Read the case study <span className="arrow">→</span>
          </span>
        </div>
      </a>
    </Reveal>
  );
}

export function Experiments() {
  return (
    <section
      id="experiments"
      data-tone="light"
      className="paper-texture relative bg-paper px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionLabel tone="light">Projects</SectionLabel>
              <h2 className="display-xl mt-6 text-[clamp(2.6rem,6vw,5rem)] leading-[1.02]">
                A few things
                <br />
                I&apos;m building.
              </h2>
            </div>
            <a
              href="/projects"
              className="link-arrow label-eyebrow pb-2 text-graphite-dim transition-colors hover:text-ember-ink"
            >
              All projects <span className="arrow">→</span>
            </a>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {featuredProjects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
