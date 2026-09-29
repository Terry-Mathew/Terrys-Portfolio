import { capabilities } from "@/content/site";
import { Reveal, SectionLabel } from "./Reveal";

export function Capabilities() {
  return (
    <section
      data-tone="light"
      className="paper-texture relative bg-paper px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <SectionLabel tone="light">Capabilities</SectionLabel>
          <h2 className="display-xl mt-6 text-[clamp(2.4rem,6vw,5rem)]">What I actually do.</h2>
        </Reveal>

        <div className="mt-16 grid gap-px bg-graphite/15 sm:grid-cols-2">
          {capabilities.map((c, i) => (
            <Reveal key={c.title} delay={i * 80} className="bg-paper p-8 md:p-12">
              <h3 className="display-xl text-3xl md:text-4xl">{c.title}</h3>
              <p className="mt-5 max-w-sm leading-relaxed text-graphite-dim">{c.body}</p>
              <ul className="hand mt-7 flex flex-wrap gap-x-5 gap-y-1 text-2xl text-graphite-dim">
                {c.keywords.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
