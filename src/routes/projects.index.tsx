import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { projectCategories, projects } from "@/content/projects";
import { projectArtwork } from "@/content/project-artwork";
import { Picture } from "@/components/site/Picture";
import { SITE_URL } from "@/content/site";
import { Reveal } from "@/components/site/Reveal";

const title = "Projects — Terry Mathew";
const description =
  "Case studies from Terry's work: multi-agent AI systems, a portfolio digital twin, and a personal finance decision simulator.";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE_URL}/projects` }],
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:url", content: `${SITE_URL}/projects` },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
  }),
  component: ProjectsIndex,
});

function ProjectsIndex() {
  const [active, setActive] = useState<string>("All");
  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <main id="main" data-skip-target tabIndex={-1} className="bg-paper text-graphite">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: title,
            description,
            url: `${SITE_URL}/projects`,
          }),
        }}
      />

      <header className="film-grain bg-ink px-5 py-16 text-bone md:px-10 md:py-24">
        <div className="relative z-10 mx-auto max-w-[1500px]">
          <p className="label-eyebrow flex items-center gap-3 text-bone-dim">
            <span className="h-px w-8 bg-ember" />
            Projects
          </p>
          <h1 className="display-xl mt-6 text-[clamp(2.6rem,7vw,5.5rem)] leading-[1.02]">
            Things I&apos;ve built.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone-dim">
            Each one is a workflow problem before it is a model problem. Here is what the problem
            was, what I built, and what it changed.
          </p>
        </div>
      </header>

      <section className="paper-texture bg-paper px-5 py-16 md:px-10 md:py-24">
        <div className="relative z-10 mx-auto max-w-[1500px]">
          <div
            role="group"
            aria-label="Filter projects by category"
            className="flex flex-wrap gap-3"
          >
            {projectCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                aria-pressed={active === c}
                className={`label-eyebrow inline-flex min-h-11 max-w-full items-center rounded-full border px-4 py-2.5 transition-colors ${
                  active === c
                    ? "border-ember-ink bg-ember-ink text-bone"
                    : "border-graphite/25 text-graphite-dim hover:border-ember-ink/60 hover:text-graphite"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mt-6 text-sm text-graphite-dim"
          >
            {filtered.length} {filtered.length === 1 ? "project" : "projects"} · {active}
          </p>
          <div className="mt-14">
            {filtered.map((p, i) => {
              const art = projectArtwork(p);
              return (
                <Reveal as="article" key={p.id} delay={i * 70}>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="project-row group grid gap-6 border-t border-graphite/20 py-10 transition-colors hover:bg-paper-2/50 focus-visible:bg-paper-2/50 lg:grid-cols-12 lg:gap-10"
                  >
                    <div className="lg:col-span-3">
                      <div className="aspect-[4/3] overflow-hidden bg-paper-2">
                        <Picture
                          avif={"avif" in art ? art.avif : undefined}
                          webp={art.webp}
                          fallback={art.src}
                          alt={art.alt}
                          width={1024}
                          height={768}
                          sizes="(min-width: 1580px) 345px, (min-width: 1024px) calc((100vw - 12.5rem) / 4), (min-width: 768px) calc(100vw - 5rem), calc(100vw - 2.5rem)"
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="mt-3 text-xs text-graphite-dim">Concept illustration</p>
                    </div>
                    <div className="flex items-start gap-6 lg:col-span-3">
                      <span className="label-eyebrow mt-1 text-ember-ink">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h2 className="display-xl text-[clamp(1.6rem,3vw,2.4rem)] text-graphite transition-colors group-hover:text-ember-ink group-focus-visible:text-ember-ink">
                          {p.title}
                        </h2>
                        <p className="label-eyebrow mt-3 text-graphite-dim">
                          {p.category} · {p.year} · {p.status}
                        </p>
                      </div>
                    </div>

                    <div className="lg:col-span-6">
                      <p className="font-editorial text-xl leading-snug text-graphite">
                        {p.subtitle}
                      </p>
                      <p className="mt-4 max-w-3xl leading-relaxed text-graphite-dim">
                        {p.description}
                      </p>
                      {p.tech.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {p.tech.slice(0, 5).map((t) => (
                            <li
                              key={t}
                              className="label-eyebrow rounded-full border border-graphite/15 px-3 py-1.5 text-graphite-dim"
                            >
                              {t}
                            </li>
                          ))}
                          {p.tech.length > 5 && (
                            <li className="label-eyebrow px-2 py-1.5 text-graphite-dim">
                              +{p.tech.length - 5}
                            </li>
                          )}
                        </ul>
                      )}
                    </div>

                    <span className="flex items-center gap-3 self-center text-sm text-graphite lg:col-span-12 lg:justify-end">
                      Read the case study
                      <span
                        aria-hidden="true"
                        className="project-row__arrow grid size-11 place-items-center rounded-full border border-graphite/25 text-graphite transition-colors group-hover:border-ember-ink group-hover:text-ember-ink group-focus-visible:border-ember-ink group-focus-visible:text-ember-ink"
                      >
                        <ArrowUpRight className="size-4" />
                      </span>
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
