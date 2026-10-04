import { ART_SIZES, projectArtwork } from "@/content/project-artwork";
import { caseStudySections, featuredProjects, type Project } from "@/content/projects";
import { Reveal, SectionLabel } from "./Reveal";
import { Picture } from "./Picture";

/** The home-page card. Shared shape with the /projects archive entries. */
export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const art = projectArtwork(project);
  return (
    <Reveal as="article" key={project.id} delay={index * 100}>
      <a
        href={`/projects/${project.id}`}
        className="project-card photo-zoom group flex h-full flex-col overflow-hidden bg-paper-2"
      >
        <div className="aspect-[4/3] overflow-hidden bg-paper">
          <Picture
            avif={"avif" in art ? art.avif : undefined}
            webp={art.webp}
            fallback={art.src}
            alt={art.alt}
            width={1024}
            height={768}
            sizes={ART_SIZES}
            loading="lazy"
            className="project-card__art h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex flex-1 flex-col p-5 sm:p-7">
          {project.illustration && (
            <p className="mb-3 text-xs text-graphite-dim">Concept illustration</p>
          )}
          <p className="project-card__status label-eyebrow text-ember-ink">
            {String(index + 1).padStart(2, "0")} · {project.category}
          </p>
          <h3 className="display-xl mt-3 break-words text-2xl text-graphite sm:text-3xl">
            {project.title}
          </h3>
          <p className="mt-2 text-xs text-graphite-dim">
            {project.year} · {project.status}
          </p>
          <p className="mt-3 font-editorial text-lg text-graphite">{project.subtitle}</p>
          <p className="mt-3 break-words text-sm leading-relaxed text-graphite-dim">
            {project.description}
          </p>
          <span className="link-arrow label-eyebrow mt-auto inline-flex pt-6 text-graphite">
            {!project.progress && caseStudySections(project).length > 0
              ? "Read the case study"
              : "View project progress"}{" "}
            <span className="arrow">→</span>
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
              className="link-arrow label-eyebrow inline-flex min-h-11 items-center pb-2 text-graphite-dim transition-colors hover:text-ember-ink"
            >
              All projects <span className="arrow">→</span>
            </a>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:mt-16 sm:gap-8 md:grid-cols-2 xl:grid-cols-3">
          {featuredProjects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
