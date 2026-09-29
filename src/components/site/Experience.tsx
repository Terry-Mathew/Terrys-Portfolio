import temple from "@/assets/temple.webp";
import { beforeOracle, profile, timeline } from "@/content/site";
import { Reveal, SectionLabel } from "./Reveal";

export function Experience() {
  return (
    <section
      id="experience"
      data-tone="light"
      className="paper-texture relative bg-paper-2 px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <Reveal>
                <SectionLabel tone="light">Experience</SectionLabel>
                <h2 className="display-xl mt-6 text-[clamp(2.6rem,6vw,5rem)] short:mt-4 short:text-[clamp(2.2rem,5vw,4rem)]">
                  8.5 years
                  <br />
                  at Oracle.
                </h2>
                <p className="mt-6 max-w-sm text-graphite-dim short:mt-4">
                  My work moved from partner transactions to team leadership, analytics, and data
                  products. The common thread was getting to the bottom of a problem and making the
                  answer useful.
                </p>

                <div className="mt-9 flex flex-wrap gap-4 short:mt-6">
                  <a
                    href={profile.resume}
                    className="link-arrow label-eyebrow rounded-full border border-graphite/25 px-5 py-3 transition-colors hover:border-ember hover:text-ember"
                  >
                    Download resume <span className="arrow">↗</span>
                  </a>
                  <a
                    href="#selected-work"
                    className="link-arrow label-eyebrow px-1 py-3 text-graphite-dim transition-colors hover:text-ember"
                  >
                    Selected work <span className="arrow">→</span>
                  </a>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <div className="mt-12 lg:mt-10 short:lg:mt-6">
                  <figure className="tape experience-print mx-auto max-w-[15rem] -rotate-1 bg-white p-3 shadow-[0_30px_60px_-30px_oklch(0_0_0/0.4)] lg:mx-0 lg:max-w-none">
                    <img
                      src={temple}
                      alt="Terry seated before a Buddha statue on landscaped temple grounds"
                      loading="lazy"
                      className="block h-auto w-full"
                    />
                  </figure>
                  <p className="hand mx-auto mt-4 max-w-[15rem] text-center text-2xl text-graphite-dim lg:mx-0 lg:max-w-none lg:text-left">
                    Between systems and stillness.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ol className="relative border-l border-graphite/20 pl-8">
              {timeline.map((role, i) => (
                <Reveal as="li" key={role.period} delay={i * 70} className="relative pb-11">
                  <span className="absolute top-2 -left-[2.15rem] size-2 rounded-full bg-ember" />
                  <p className="label-eyebrow text-graphite-dim">{role.period}</p>
                  <h3 className="mt-2 font-editorial text-2xl md:text-3xl">{role.title}</h3>
                  <p className="label-eyebrow mt-2 text-ember">{role.org}</p>
                  <p className="mt-3 max-w-lg leading-relaxed text-graphite-dim">{role.note}</p>
                </Reveal>
              ))}

              <Reveal as="li" className="relative">
                <span className="absolute top-2 -left-[2.15rem] size-2 rounded-full bg-graphite/40" />
                <p className="label-eyebrow text-graphite-dim">Before Oracle</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-editorial text-xl">
                  {beforeOracle.map((step, i) => (
                    <span key={step} className="flex items-center gap-3">
                      {i > 0 && <span className="text-ember">→</span>}
                      {step}
                    </span>
                  ))}
                </p>
                <p className="hand group mt-8 cursor-default text-2xl text-graphite-dim">
                  There were dashboards, systems, stakeholders… and apparently this.
                  <span className="mt-2 block max-w-[10rem] text-base opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    (that story stays offline — ask me in person)
                  </span>
                </p>
              </Reveal>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
