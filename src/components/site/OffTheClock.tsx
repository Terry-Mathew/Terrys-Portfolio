import bikeSunset from "@/assets/bike-sunset.webp";
import enfield from "@/assets/enfield.webp";
import birds from "@/assets/birds.webp";
import { profile } from "@/content/site";
import { Reveal, SectionLabel } from "./Reveal";

export function OffTheClock() {
  return (
    <section
      data-tone="light"
      className="paper-texture torn-edge-top relative overflow-x-clip bg-paper-2 px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <SectionLabel tone="light">Beyond work</SectionLabel>
          <h2 className="mt-6 font-editorial text-[clamp(2.6rem,6vw,5rem)] leading-none">
            Off The Clock.
          </h2>
          <p className="hand mt-5 text-3xl text-graphite-dim">Different places. Same curiosity.</p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-12 md:gap-8">
          <Reveal className="md:col-span-6">
            <figure className="photo-zoom relative shadow-[0_30px_60px_-32px_oklch(0_0_0/0.4)]">
              <img
                src={bikeSunset}
                alt="Terry looking back over his shoulder while seated on a motorcycle at sunset on a highway"
                loading="lazy"
                className="block h-64 w-full object-cover sm:h-80 md:h-[30rem]"
              />
              <figcaption className="hand mt-3 text-2xl text-graphite-dim">Long roads.</figcaption>
            </figure>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 md:col-span-6 md:gap-8">
            <Reveal delay={90} className="md:min-h-0">
              <figure className="photo-zoom rotate-2 bg-white p-3 shadow-[0_24px_50px_-28px_oklch(0_0_0/0.35)]">
                <img
                  src={birds}
                  alt="Terry feeding colourful birds in a garden"
                  loading="lazy"
                  className="block h-64 w-full object-cover sm:h-80 md:h-[27rem]"
                />
                <figcaption className="hand mt-3 text-xl text-graphite-dim md:text-2xl">
                  Small moments. Big joy.
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={160} className="md:min-h-0">
              <figure className="photo-zoom -rotate-1 bg-white p-3 shadow-[0_24px_50px_-28px_oklch(0_0_0/0.35)]">
                <img
                  src={enfield}
                  alt="Terry seated on a Royal Enfield motorcycle on a city street"
                  loading="lazy"
                  className="block h-64 w-full object-cover sm:h-80 md:h-[27rem]"
                />
                <figcaption className="hand mt-3 text-xl text-graphite-dim md:text-2xl">
                  People. Places. Perspectives.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>

        <Reveal delay={120}>
          <a
            href={profile.instagram}
            target="_blank"
            rel="noreferrer"
            className="link-arrow label-eyebrow mt-10 inline-flex text-graphite transition-colors hover:text-ember md:mt-12"
          >
            More life → Instagram <span className="arrow">↗</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
