import iguana from "@/assets/iguana.webp";
import { Reveal, SectionLabel } from "./Reveal";

export function About() {
  return (
    <section
      id="about"
      data-tone="light"
      className="paper-texture torn-edge-top relative bg-paper px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <SectionLabel tone="light">About</SectionLabel>
          <p className="display-xl mt-6 text-[clamp(2rem,5vw,3.5rem)]">Not just a portfolio.</p>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <Reveal delay={80}>
              <h2 className="font-editorial text-[clamp(1.7rem,3vw,2.6rem)] leading-[1.2]">
                I work at the intersection of product, data, and business systems, usually where the
                problem is still unclear and the path forward is not obvious.
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <div className="mt-10 max-w-xl space-y-6 border-l border-ember/60 pl-6 text-[1.05rem] leading-[1.75] text-graphite-dim">
                <p>
                  My career has taken me through operations, analytics, team leadership, and product
                  management. Over time, the work became less about producing reports and more about
                  understanding how information, processes, and people fit together.
                </p>
                <p>
                  I've worked on global partner systems, analytics products, operational workflows,
                  and decision tools used across different teams and functions. The common thread
                  has been the same: take something complicated, create structure around it, and
                  make it easier to use or act on.
                </p>
                <p>
                  Outside work, I build my own product ideas, experiment with AI, and spend a fair
                  amount of time exploring things that have nothing to do with job titles.
                </p>
                <p className="font-editorial text-[1.25rem] text-graphite">
                  This site is a mix of both.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={120}>
              <figure className="tape relative mx-auto max-w-sm -rotate-2 bg-white p-3 shadow-[0_28px_60px_-28px_oklch(0_0_0/0.35)]">
                <img
                  src={iguana}
                  alt="Terry crouching beside an iguana in a landscaped enclosure"
                  loading="lazy"
                  className="w-full object-cover"
                />
                <figcaption className="hand mt-3 text-2xl text-graphite-dim">
                  Different contexts.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
