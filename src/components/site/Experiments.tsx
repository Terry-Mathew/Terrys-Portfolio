import settle from "@/assets/project-settle.jpg";
import jannanayak from "@/assets/project-jannanayak.jpg";
import iconsherald from "@/assets/project-iconsherald.jpg";
import { experiments } from "@/content/site";
import { Reveal, SectionLabel } from "./Reveal";

const covers: Record<string, { src: string; alt: string }> = {
  Settle: { src: settle, alt: "Phone on a dark desk showing a minimal finance app" },
  Jannanayak: { src: jannanayak, alt: "Civic building at dusk with a blurred crowd passing" },
  Iconsherald: { src: iconsherald, alt: "Wall of pinned archival portrait photographs" },
};

export function Experiments() {
  return (
    <section
      id="experiments"
      data-tone="dark"
      className="film-grain relative bg-ink-2 px-5 py-24 md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <SectionLabel>Current experiments</SectionLabel>
          <h2 className="mt-6 font-editorial text-[clamp(2.6rem,6vw,5rem)] leading-[1.02] text-bone">
            A few things
            <br />
            I'm building.
          </h2>
          <p className="mt-6 max-w-xl leading-relaxed text-bone-dim">
            Products, platforms and ideas exploring complicated real-world problems.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {experiments.map((x, i) => {
            const cover = covers[x.name] ?? { src: settle, alt: x.name };
            return (
              <Reveal as="article" key={x.name} delay={i * 100}>
                <a
                  href="#contact"
                  className="photo-zoom group relative block h-full overflow-hidden bg-ink transition-transform duration-500 hover:-translate-y-1.5"
                >
                  <img
                    src={cover.src}
                    alt={cover.alt}
                    loading="lazy"
                    width={912}
                    height={1104}
                    className="h-[26rem] w-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7">
                    <p className="label-eyebrow text-ember">
                      0{i + 1} · {x.status}
                    </p>
                    <h3 className="display-xl mt-3 text-3xl text-bone">{x.name}</h3>
                    <p className="mt-3 font-editorial text-lg text-bone">{x.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-bone-dim">{x.body}</p>
                    <span className="link-arrow label-eyebrow mt-6 inline-flex text-bone">
                      {x.cta} <span className="arrow">→</span>
                    </span>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
