import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { caseStudySections, getProjectById, nextProject, prevProject } from "@/content/projects";
import { SITE_URL } from "@/content/site";
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
    return {
      meta: [
        { title },
        { name: "description", content: p.description },
        { property: "og:title", content: title },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "article" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: p.description },
      ],
    };
  },
  component: ProjectDetail,
  notFoundComponent: () => (
    <main
      id="main"
      data-skip-target
      tabIndex={-1}
      className="film-grain grid min-h-screen place-items-center bg-ink px-5 text-bone"
    >
      <div className="max-w-md text-center">
        <h1 className="display-xl text-4xl">Project not found.</h1>
        <Link to="/projects" className="link-arrow label-eyebrow mt-8 inline-flex text-bone-dim">
          ← All projects
        </Link>
      </div>
    </main>
  ),
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const project = getProjectById(projectId);
  // Unreachable via navigation — the loader rejects unknown ids first. Kept so
  // a client-side race cannot render an empty page instead of the 404.
  if (!project) throw notFound();

  const sections = caseStudySections(project);
  const prev = prevProject(project.id);
  const next = nextProject(project.id);

  return (
    <main id="main" data-skip-target tabIndex={-1} className="bg-paper text-graphite">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            description: project.description,
            url: `${SITE_URL}/projects/${project.id}`,
            dateCreated: project.year,
            keywords: project.tech.join(", "),
          }),
        }}
      />

      <header className="film-grain bg-ink px-5 pb-16 pt-28 text-bone md:px-10 md:pb-24 md:pt-36">
        <div className="relative z-10 mx-auto max-w-[1500px]">
          <Link
            to="/projects"
            className="label-eyebrow inline-flex text-bone-dim transition-colors hover:text-ember"
          >
            ← All projects
          </Link>

          <p className="label-eyebrow mt-12 flex items-center gap-3 text-ember">
            <span className="h-px w-8 bg-ember" />
            {project.category}
          </p>
          <h1 className="display-xl mt-6 text-[clamp(2.4rem,7vw,5.5rem)] leading-[1.02]">
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

      <article className="paper-texture bg-paper px-5 py-16 md:px-10 md:py-24">
        <div className="relative z-10 mx-auto max-w-[1100px]">
          {sections.map((section, i) => (
            <Reveal key={section.key} delay={i * 60}>
              <div className="grid gap-4 border-t border-graphite/20 py-10 md:grid-cols-[8rem_1fr] md:gap-10">
                <p className="label-eyebrow pt-1 text-ember-ink">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div>
                  <h2 className="display-xl text-2xl text-graphite md:text-3xl">{section.label}</h2>
                  <p className="mt-5 whitespace-pre-line text-lg leading-[1.75] text-graphite-dim">
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

          <nav className="grid gap-6 border-t border-graphite/20 pt-10 sm:grid-cols-2">
            {prev ? (
              <Link to="/projects/$projectId" params={{ projectId: prev.id }} className="group">
                <p className="label-eyebrow text-graphite-dim">← Previous</p>
                <p className="display-xl mt-2 text-2xl text-graphite transition-colors group-hover:text-ember-ink">
                  {prev.title}
                </p>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to="/projects/$projectId"
                params={{ projectId: next.id }}
                className="group sm:text-right"
              >
                <p className="label-eyebrow text-graphite-dim">Next →</p>
                <p className="display-xl mt-2 text-2xl text-graphite transition-colors group-hover:text-ember-ink">
                  {next.title}
                </p>
              </Link>
            )}
          </nav>
        </div>
      </article>
    </main>
  );
}
