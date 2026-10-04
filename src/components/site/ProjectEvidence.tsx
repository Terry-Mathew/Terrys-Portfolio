import type { ProjectEvidence as Evidence } from "@/content/projects";

/** A source-backed explanation, not a simulated product interface. */
export function ProjectEvidence({ evidence }: { evidence: Evidence }) {
  return (
    <section
      aria-labelledby="project-evidence-title"
      className="border-b border-graphite/20 pb-12 md:pb-16"
    >
      <div data-evidence-intro>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="label-eyebrow text-ember-ink">Inside the project</p>
          <p className="label-eyebrow text-graphite-dim">Explanatory diagram · Project workflow</p>
        </div>
        <h2
          id="project-evidence-title"
          tabIndex={-1}
          className="display-xl scroll-mt-24 mt-5 max-w-3xl text-3xl leading-tight md:text-5xl"
        >
          {evidence.title}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-graphite-dim">
          {evidence.summary}
        </p>
      </div>
      <figure className="mt-10">
        <ol className="grid gap-3 lg:grid-cols-3">
          {evidence.stages.map((stage, index) => (
            <li
              key={stage.title}
              className="relative min-w-0 border border-graphite/20 bg-paper p-5 sm:p-6 md:p-8"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="label-eyebrow text-ember-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="text-2xl text-graphite-dim">
                  {index < evidence.stages.length - 1 ? (
                    <>
                      <span className="lg:hidden">↓</span>
                      <span className="hidden lg:inline">→</span>
                    </>
                  ) : (
                    "↗"
                  )}
                </span>
              </div>
              <h3 className="mt-6 break-words font-editorial text-2xl sm:mt-10 text-graphite">
                {stage.title}
              </h3>
              <p className="mt-4 break-words leading-relaxed text-graphite-dim">
                {stage.description}
              </p>
            </li>
          ))}
        </ol>
        <figcaption className="mt-5 max-w-3xl text-sm leading-relaxed text-graphite-dim">
          {evidence.caption}
        </figcaption>
      </figure>
      <div className="mt-10 grid gap-8 border-t border-graphite/20 pt-8 md:grid-cols-2">
        {evidence.decisions.map((decision) => (
          <div key={decision.title}>
            <h3 className="label-eyebrow text-ember-ink">{decision.title}</h3>
            <p className="mt-4 break-words leading-relaxed text-graphite-dim">
              {decision.description}
            </p>
          </div>
        ))}
      </div>
      {evidence.source && (
        <a
          href={evidence.source}
          target="_blank"
          rel="noopener noreferrer"
          className="link-arrow label-eyebrow mt-8 inline-flex min-h-11 items-center gap-2 text-graphite"
        >
          Inspect the source <span className="arrow">↗</span>
        </a>
      )}
    </section>
  );
}
