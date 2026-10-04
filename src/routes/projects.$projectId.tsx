import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { caseStudySections, getProjectById, nextProject, prevProject } from "@/content/projects";
import { projectArtwork } from "@/content/project-artwork";
import { SITE_URL } from "@/content/site";
import { MissingPage } from "@/components/site/MissingPage";
import { Picture } from "@/components/site/Picture";
import { ProjectEvidence } from "@/components/site/ProjectEvidence";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/projects/$projectId")({
  // Resolved in a loader rather than inside the component: the rejection runs
  // before the page renders, so an unknown slug is a real not-found rather than
  // a 200 with an error page painted into it.
  loader: ({ params }) => {
    if (!getProjectById(params.projectId)) throw notFound();
  },
  head: ({ params }) => {
    const p = getProjectById(params.projectId);
    if (!p) return { meta: [{ title: "Project not found — Terry Mathew" }] };
    const title = `${p.title} — Terry Mathew`;
    const art = projectArtwork(p);
    return {
      links: [{ rel: "canonical", href: `${SITE_URL}/projects/${p.id}` }],
      meta: [
        { title },
        { name: "description", content: p.description },
        { property: "og:title", content: title },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `${SITE_URL}/projects/${p.id}` },
        { property: "og:image", content: new URL(art.src, SITE_URL).href },
        { property: "og:image:width", content: "1024" },
        { property: "og:image:height", content: "768" },
        { property: "og:image:alt", content: art.alt },
        { name: "twitter:image", content: new URL(art.src, SITE_URL).href },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: p.description },
      ],
    };
  },
  component: ProjectDetail,
  notFoundComponent: () => <MissingPage title="Project not found" />,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const project = getProjectById(projectId);
  // Unreachable via navigation — the loader rejects unknown ids first. Kept so
  // a client-side race cannot render an empty page instead of the 404.
  if (!project) throw notFound();

  const art = projectArtwork(project);
  const sections = caseStudySections(project);
  const prev = prevProject(project.id);
  const next = nextProject(project.id);

  return (
    <main
      id="main"
      data-case-study
      data-skip-target
      tabIndex={-1}
      className="bg-paper text-graphite"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: project.description,
            url: `${SITE_URL}/projects/${project.id}`,
            ...(/^\d{4}$/.test(project.year) ? { dateCreated: project.year } : {}),
            keywords: project.tech.join(", "),
          }),
        }}
      />

      <header className="film-grain bg-ink px-5 py-12 text-bone sm:py-16 md:px-10 md:py-24">
        <div className="relative z-10 mx-auto max-w-[1500px]">
          <p className="label-eyebrow flex items-center gap-3 text-ember">
            <span className="h-px w-8 bg-ember" />
            {project.category}
          </p>
          <h1 className="display-xl mt-6 break-words text-[clamp(2.4rem,7vw,5.5rem)] leading-[1.02]">
            {project.title}
          </h1>
          <p className="mt-6 max-w-2xl font-editorial text-2xl leading-snug text-bone">
            {project.subtitle}
          </p>
          <p className="mt-6 max-w-2xl leading-relaxed text-bone-dim">{project.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="label-eyebrow text-bone-dim">
              {project.year} · {project.status}
            </span>
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="link-arrow label-eyebrow rounded-full border border-bone/25 px-5 py-3 text-bone transition-colors hover:border-ember hover:text-ember"
              >
                Code <span className="arrow">↗</span>
              </a>
            )}
            {project.youtube && (
              <a
                href={project.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="link-arrow label-eyebrow rounded-full border border-bone/25 px-5 py-3 text-bone transition-colors hover:border-ember hover:text-ember"
              >
                Demo <span className="arrow">↗</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <article className="paper-texture bg-paper px-5 py-10 sm:py-16 md:px-10 md:py-24">
        <div className="relative z-10 mx-auto max-w-[1100px]">
          {sections.length > 0 && (
            <nav
              data-print-hide
              aria-label="Case study sections"
              className="mb-10 border-y border-graphite/20 py-5"
            >
              <p className="label-eyebrow text-ember-ink">In this story</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                <li>
                  <a
                    href="#project-concept"
                    className="inline-flex min-h-11 items-center text-sm text-graphite-dim underline decoration-graphite/25 underline-offset-4 hover:text-ember-ink"
                  >
                    Concept image
                  </a>
                </li>
                {project.evidence && (
                  <li>
                    <a
                      href="#project-evidence-title"
                      className="inline-flex min-h-11 items-center text-sm text-graphite-dim underline decoration-graphite/25 underline-offset-4 hover:text-ember-ink"
                    >
                      Project workflow
                    </a>
                  </li>
                )}
                {sections.map((section) => (
                  <li key={section.key}>
                    <a
                      href={`#${section.key}`}
                      className="inline-flex min-h-11 items-center text-sm text-graphite-dim underline decoration-graphite/25 underline-offset-4 hover:text-ember-ink"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <figure id="project-concept" tabIndex={-1} className="mb-12 scroll-mt-24 md:mb-16">
            <div className="aspect-[4/3] overflow-hidden bg-paper-2">
              <Picture
                avif={"avif" in art ? art.avif : undefined}
                webp={art.webp}
                fallback={art.src}
                alt={art.alt}
                width={1024}
                height={768}
                sizes="(min-width: 1180px) 1100px, (min-width: 768px) calc(100vw - 5rem), calc(100vw - 2.5rem)"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-4 max-w-3xl text-sm leading-relaxed text-graphite-dim">
              {project.illustration?.caption ??
                "Concept illustration. This artwork represents the project idea; it is not a product screen."}
            </figcaption>
          </figure>
          {project.progress && (
            <p className="label-eyebrow mb-8 text-ember-ink">
              Project progress · Work in development
            </p>
          )}
          {project.evidence && <ProjectEvidence evidence={project.evidence} />}

          {sections.map((section, i) => (
            <Reveal key={section.key}>
              <div className="grid min-w-0 gap-4 border-t border-graphite/20 py-7 sm:py-10 md:grid-cols-[8rem_1fr] md:gap-10">
                <p className="label-eyebrow pt-1 text-ember-ink">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <h2
                    id={section.key}
                    tabIndex={-1}
                    className="display-xl scroll-mt-24 text-2xl text-graphite md:text-3xl"
                  >
                    {section.label}
                  </h2>
                  <p className="mt-5 break-words whitespace-pre-line text-base leading-[1.75] sm:text-lg text-graphite-dim">
                    {project[section.key]}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}

          {project.tech.length > 0 && (
            <Reveal>
              <div className="border-t border-graphite/20 py-10">
                <h2 className="label-eyebrow text-graphite-dim">Tech stack</h2>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {project.tech.map((t) => (
                    <li
                      key={t}
                      className="label-eyebrow rounded-full border border-graphite/20 px-4 py-2 text-graphite"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}

          <nav
            data-print-hide
            aria-label="Continue reading projects"
            className="grid gap-4 border-t border-graphite/20 pt-10 sm:grid-cols-2"
          >
            {prev ? (
              <Link
                to="/projects/$projectId"
                params={{ projectId: prev.id }}
                className="group min-w-0 border border-graphite/20 bg-paper-2 p-5 transition-colors hover:border-ember-ink sm:p-6"
              >
                <p className="label-eyebrow text-graphite-dim">← Previous</p>
                <p className="display-xl mt-2 text-2xl text-graphite transition-colors group-hover:text-ember-ink">
                  {prev.title}
                </p>
                <p className="mt-3 break-words text-sm leading-relaxed text-graphite-dim">
                  {prev.subtitle}
                </p>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to="/projects/$projectId"
                params={{ projectId: next.id }}
                className="group min-w-0 border border-graphite/20 bg-paper-2 p-5 transition-colors hover:border-ember-ink sm:p-6 sm:text-right"
              >
                <p className="label-eyebrow text-graphite-dim">Next →</p>
                <p className="display-xl mt-2 text-2xl text-graphite transition-colors group-hover:text-ember-ink">
                  {next.title}
                </p>
                <p className="mt-3 break-words text-sm leading-relaxed text-graphite-dim">
                  {next.subtitle}
                </p>
              </Link>
            )}
          </nav>
        </div>
      </article>
    </main>
  );
}
