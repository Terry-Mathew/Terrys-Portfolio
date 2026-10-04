import bikeSunset from "@/assets/bike-sunset.webp";
import bikeAvif660 from "@/assets/bike-sunset-660w.avif";
import bikeAvif1098 from "@/assets/bike-sunset-1098w.avif";
import bikeWebp660 from "@/assets/bike-sunset-660w.webp";
import bikeWebp1098 from "@/assets/bike-sunset-1098w.webp";
import mahad from "@/assets/mahad-trip.webp";
import mahadAvif360 from "@/assets/mahad-trip-360w.avif";
import mahadAvif720 from "@/assets/mahad-trip-720w.avif";
import mahadWebp360 from "@/assets/mahad-trip-360w.webp";
import mahadWebp720 from "@/assets/mahad-trip-720w.webp";
import birds from "@/assets/birds.webp";
import birdsAvif384 from "@/assets/birds-384w.avif";
import birdsAvif752 from "@/assets/birds-752w.avif";
import birdsWebp384 from "@/assets/birds-384w.webp";
import birdsWebp752 from "@/assets/birds-752w.webp";
import { profile } from "@/content/site";
import { Reveal, SectionLabel } from "./Reveal";
import { Picture } from "./Picture";

const BIKE_AVIF = `${bikeAvif660} 660w, ${bikeAvif1098} 1098w`;
const BIKE_WEBP = `${bikeWebp660} 660w, ${bikeWebp1098} 1098w`;
// md:col-span-6 of a 12-column grid inside max-w-[1500px], which measured 664px
// at a 1440px viewport.
const BIKE_SIZES = "(min-width: 80rem) 660px, (min-width: 48rem) 46vw, 92vw";

const MAHAD_AVIF = `${mahadAvif360} 360w, ${mahadAvif720} 720w`;
const MAHAD_WEBP = `${mahadWebp360} 360w, ${mahadWebp720} 720w`;

const BIRDS_AVIF = `${birdsAvif384} 384w, ${birdsAvif752} 752w`;
const BIRDS_WEBP = `${birdsWebp384} 384w, ${birdsWebp752} 752w`;
// Half of the 6-column block, inside a 2-up sub-grid below md.
const HALF_SIZES =
  "(min-width: 80rem) 320px, (min-width: 48rem) 23vw, (min-width: 40rem) 46vw, 92vw";

export function OffTheClock() {
  return (
    <section
      id="beyond-work"
      data-tone="light"
      className="paper-texture torn-edge-top relative overflow-x-clip bg-paper-2 section-reading-padding px-5 text-graphite md:px-10"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <SectionLabel tone="light">Beyond work</SectionLabel>
          <h2 className="mt-6 font-editorial text-[clamp(2.6rem,6vw,5rem)] leading-none">
            Off The Clock.
          </h2>
          <p className="hand mt-5 text-2xl text-graphite-dim sm:text-3xl">
            Different places. Same curiosity.
          </p>
        </Reveal>

        <div className="mt-8 grid gap-6 sm:mt-12 md:grid-cols-12 md:gap-8">
          <Reveal className="md:col-span-6">
            <figure className="photo-zoom relative shadow-[0_30px_60px_-32px_oklch(0_0_0/0.4)]">
              <Picture
                avif={BIKE_AVIF}
                webp={BIKE_WEBP}
                fallback={bikeSunset}
                alt="Terry looking back over his shoulder while seated on a motorcycle at sunset on a highway"
                width={1098}
                height={1432}
                sizes={BIKE_SIZES}
                loading="lazy"
                // The subject's head sits in the top ~15% of a 3:4 portrait. A
                // centred landscape crop takes the band from 35-75% and cuts
                // him off entirely, so the window is anchored near the top and
                // nudged right to where he actually is.
                className="block h-64 w-full object-cover object-[55%_12%] sm:h-80 md:h-[25rem]"
              />
              <figcaption className="hand mt-3 text-2xl text-graphite-dim">Long roads.</figcaption>
            </figure>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 md:col-span-6 md:gap-8">
            <Reveal delay={90} className="md:min-h-0">
              <figure className="photo-zoom rotate-2 bg-white p-3 shadow-[0_24px_50px_-28px_oklch(0_0_0/0.35)]">
                <Picture
                  avif={BIRDS_AVIF}
                  webp={BIRDS_WEBP}
                  fallback={birds}
                  alt="Terry feeding colourful birds in a garden"
                  width={941}
                  height={1672}
                  sizes={HALF_SIZES}
                  loading="lazy"
                  className="block h-64 w-full object-cover sm:h-80 md:h-[23.5rem]"
                />
                <figcaption className="hand mt-3 text-xl text-graphite-dim md:text-2xl">
                  Small moments. Big joy.
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={160} className="md:min-h-0">
              <figure className="photo-zoom -rotate-1 bg-white p-3 shadow-[0_24px_50px_-28px_oklch(0_0_0/0.35)]">
                <Picture
                  avif={MAHAD_AVIF}
                  webp={MAHAD_WEBP}
                  fallback={mahad}
                  alt="Terry sitting alone in a stone doorway at a basalt fort in Mahad, Maharashtra"
                  width={720}
                  height={1280}
                  sizes={HALF_SIZES}
                  loading="lazy"
                  className="block h-64 w-full object-cover sm:h-80 md:h-[23.5rem]"
                />
                <figcaption className="hand mt-3 text-xl text-graphite-dim md:text-2xl">
                  Small figure. Big stone.
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
            className="link-arrow label-eyebrow mt-8 inline-flex min-h-11 items-center text-graphite transition-colors hover:text-ember-ink md:mt-12"
          >
            More life → Instagram <span className="arrow">↗</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
