import { caseStudies } from "@/content/site";
import { Reveal } from "./Reveal";

/** Typographic, image-free professional stories. Enterprise work is confidential. */
export function SelectedWork() {
  return (
    <section
      id="selected-work"
      data-tone="light"
      className="paper-texture relative bg-paper-2 px-5 pb-24 text-graphite md:px-10 md:pb-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px] border-t border-graphite/20 pt-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="display-xl text-[clamp(2.2rem,5vw,4rem)]">Selected professional work</h2>
            <p className="hand text-2xl text-graphite-dim">Real work. Real constraints.</p>
          </div>
        </Reveal>

        <div className="mt-12">
          {caseStudies.map((s, i) => (
            <Reveal as="article" key={s.title} delay={i * 80}>
              <div className="group grid gap-8 border-b border-graphite/20 py-12 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-5">
                  <h3 className="display-xl text-[clamp(2rem,3.6vw,3.2rem)]">{s.title}</h3>
                  <p className="label-eyebrow mt-4 text-graphite-dim">{s.tags}</p>
                  <p className="mt-6 max-w-md font-editorial text-2xl leading-snug">{s.summary}</p>
                </div>
                <dl className="grid gap-8 sm:grid-cols-3 lg:col-span-7 lg:pt-4">
                  {[
                    ["The problem", s.problem],
                    ["My role", s.role],
                    ["What changed", s.changed],
                  ].map(([k, v]) => (
                    <div key={k} className="border-t border-graphite/25 pt-4">
                      <dt className="label-eyebrow text-ember">{k}</dt>
                      <dd className="mt-3 leading-relaxed text-graphite-dim">{v}</dd>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-3">
                    <span className="label-eyebrow text-[0.6rem] text-graphite-dim">
                      Enterprise work · details intentionally limited
                    </span>
                    <a
                      href="#contact"
                      className="link-arrow label-eyebrow transition-colors hover:text-ember"
                    >
                      View story <span className="arrow">→</span>
                    </a>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
