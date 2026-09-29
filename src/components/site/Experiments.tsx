import discoveryArt from "@/assets/project-discovery.jpg";
import researchArt from "@/assets/project-research.jpg";
import settleArt from "@/assets/project-settle.jpg";
import { featuredProjects, type Project } from "@/content/projects";
import { Reveal, SectionLabel } from "./Reveal";

// Keyed by project id, not title — a rename in projects.ts must not silently
// drop the artwork.
const FALLBACK_ART = {
  src: settleArt,
  alt: "Abstract editorial artwork in warm tones",
} as const;

const artwork: Record<string, { src: string; alt: string }> = {
  settle: { src: settleArt, alt: "Abstract editorial artwork in warm tones" },
  "product-discovery-ai": { src: discoveryArt, alt: "Editorial artwork in warm tones" },
  "deep-research-agent": { src: researchArt, alt: "Editorial artwork in warm tones" },
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
        <img
          src={art.src}
          alt={art.alt}
          loading="lazy"
          width={1024}
          height={768}
          className="h-[24rem] w-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-paper-2 via-paper-2/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-7">
          <p className="label-eyebrow text-ember">
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
              className="link-arrow label-eyebrow pb-2 text-graphite-dim transition-colors hover:text-ember"
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
