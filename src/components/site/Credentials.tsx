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
      className="paper-texture relative bg-paper section-reading-padding px-5 text-graphite md:px-10"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionLabel tone="light">Continuous Learning</SectionLabel>
              <h2 className="display-xl mt-6 text-[clamp(2.2rem,5vw,3.8rem)]">
                Continuous learning.
              </h2>
            </div>
            <div className="hidden gap-3 sm:flex">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Scroll credentials left"
                className="grid size-11 place-items-center rounded-full border border-graphite/25 text-graphite transition-colors hover:border-ember-ink hover:text-ember-ink"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Scroll credentials right"
                className="grid size-11 place-items-center rounded-full border border-graphite/25 text-graphite transition-colors hover:border-ember-ink hover:text-ember-ink"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </Reveal>

        <div
          ref={railRef}
          id="credentials-list"
          data-credentials-rail
          className="mt-10 flex flex-col gap-4 pb-4 sm:mt-14 sm:flex-row sm:snap-x sm:snap-mandatory sm:overflow-x-auto"
          // The rail is a scroll container, so the focus ring belongs on it too.
          tabIndex={0}
          role="group"
          aria-label="Certifications"
        >
          {visible.map((cert, i) => (
            <Reveal
              key={cert.url}
              delay={i * 60}
              className="w-full min-w-0 shrink-0 snap-start sm:w-[22rem]"
            >
              <a
                href={cert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border border-graphite/15 bg-paper-2 p-5 transition-colors sm:p-7 hover:border-ember-ink/50"
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full border border-ember-ink/40 text-lg text-ember-ink"
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
                <span className="link-arrow label-eyebrow mt-auto inline-flex pt-6 text-graphite-dim transition-colors group-hover:text-ember-ink">
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
              aria-expanded={showAll}
              aria-controls="credentials-list"
              className="link-arrow label-eyebrow mt-8 inline-flex min-h-11 items-center rounded-full sm:mt-10 border border-graphite/25 px-5 py-3 text-graphite transition-colors hover:border-ember-ink hover:text-ember-ink"
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
