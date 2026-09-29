import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { certifications } from "@/content/expertise";
import { Reveal, SectionLabel } from "./Reveal";

const COLLAPSED_COUNT = 3;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Credentials() {
  const railRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

  const scrollBy = (dir: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    // A card plus its gap — one whole card at a time, so the rail lands on a
    // snap point rather than mid-card.
    const card = rail.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: dir * step, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const visible = showAll ? certifications : certifications.slice(0, COLLAPSED_COUNT);
  const hiddenCount = certifications.length - COLLAPSED_COUNT;

  return (
    <section
      id="credentials"
      data-tone="light"
      className="paper-texture relative bg-paper px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionLabel tone="light">Credentials</SectionLabel>
              <h2 className="display-xl mt-6 text-[clamp(2.2rem,5vw,3.8rem)]">
                Continuous learning.
              </h2>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Scroll credentials left"
                className="grid size-11 place-items-center rounded-full border border-graphite/25 text-graphite transition-colors hover:border-ember hover:text-ember"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Scroll credentials right"
                className="grid size-11 place-items-center rounded-full border border-graphite/25 text-graphite transition-colors hover:border-ember hover:text-ember"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <p className="mt-6 max-w-xl leading-relaxed text-graphite-dim">
            Certified across Oracle, Google Cloud, Udemy and Accenture. Every credential links to
            its verification badge.
          </p>
        </Reveal>

        <div
          ref={railRef}
          className="mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
          // The rail is a scroll container, so the focus ring belongs on it too.
          tabIndex={0}
          role="group"
          aria-label="Certifications, scrollable"
        >
          {visible.map((cert, i) => (
            <Reveal
              key={cert.url}
              delay={i * 60}
              className="w-[19rem] shrink-0 snap-start sm:w-[22rem]"
            >
              <a
                href={cert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border border-graphite/15 bg-paper-2 p-7 transition-colors hover:border-ember/50"
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full border border-ember/40 text-lg text-ember"
                  >
                    {cert.mark}
                  </span>
                  <div className="min-w-0">
                    <p className="label-eyebrow text-graphite-dim">{cert.issuer}</p>
                    <p className="label-eyebrow text-graphite-dim">{cert.year}</p>
                  </div>
                </div>
                <p className="mt-6 font-editorial text-xl leading-snug text-graphite">
                  {cert.name}
                </p>
                <span className="link-arrow label-eyebrow mt-auto inline-flex pt-6 text-graphite-dim transition-colors group-hover:text-ember">
                  Verify <span className="arrow">↗</span>
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        {hiddenCount > 0 && (
          <Reveal delay={120}>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="link-arrow label-eyebrow mt-10 inline-flex rounded-full border border-graphite/25 px-5 py-3 text-graphite transition-colors hover:border-ember hover:text-ember"
            >
              {showAll ? "Show fewer" : `View all ${certifications.length} credentials`}
              <span className="arrow">→</span>
            </button>
          </Reveal>
        )}
      </div>
    </section>
  );
}
