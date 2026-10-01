import { gsap } from "gsap";
import iguana from "@/assets/iguana.webp";
import iguanaAvif384 from "@/assets/iguana-384w.avif";
import iguanaAvif768 from "@/assets/iguana-768w.avif";
import iguanaWebp384 from "@/assets/iguana-384w.webp";
import iguanaWebp768 from "@/assets/iguana-768w.webp";
import { DURATION, EASE, onceOnScroll } from "@/lib/motion";
import { useGsapContext } from "@/lib/useGsapContext";
import { SectionLabel } from "./Reveal";
import { Picture } from "./Picture";

const IGUANA_AVIF = `${iguanaAvif384} 384w, ${iguanaAvif768} 768w`;
const IGUANA_WEBP = `${iguanaWebp384} 384w, ${iguanaWebp768} 768w`;
// Capped at max-w-sm (24rem) on every breakpoint, so 24rem is the real slot.
const IGUANA_SIZES = "(min-width: 64rem) 24rem, 92vw";

/**
 * Entrance order. The section reads top to bottom, so the label and tagline
 * lead; the three supporting paragraphs are the only staggered group, because
 * `Reveal` wrapped all three in a single element and structurally could not
 * stagger them. The image and its caption resolve last.
 */
const ENTRANCE = {
  label: 0,
  tagline: 0.08,
  thesis: 0.16,
  paragraph1: 0.28,
  paragraph: 0.07,
  column: 0.22,
  link: 0.52,
  caption: 0.62,
} as const;

/** How far each element rises as it arrives. Small on purpose. */
const RISE = {
  label: 10,
  heading: 20,
  body: 14,
  column: 28,
  link: 12,
  caption: 8,
} as const;

/** The card's transient tilt on the way in, in degrees. Settles to 0. */
const COLUMN_TILT = 0.8;

/**
 * Fail open. The stylesheet hides About's content behind `html.js`, so if the
 * timeline cannot be built for any reason — GSAP missing, a plugin throwing, a
 * selector no longer matching — the copy must not be left invisible. This
 * stamps `data-about-failed` on the section, and the stylesheet immediately
 * restores every target, so the worst case is a section that appears without
 * animating rather than a section that never appears at all.
 */
function revealImmediately(section: Element | null) {
  if (!section) return;
  section.setAttribute("data-about-failed", "");
  for (const el of section.querySelectorAll<HTMLElement>("[data-about-reveal]")) {
    gsap.set(el, { clearProps: "opacity,transform,willChange" });
  }
}

export function About() {
  const scopeRef = useGsapContext((context) => {
    const section = document.getElementById("about");
    if (!(section instanceof HTMLElement)) return;

    try {
      const intro = gsap.timeline({
        defaults: { ease: EASE.out },
        scrollTrigger: onceOnScroll(section),
      });

      // Each element is looked up by its own key and both ends are stated
      // explicitly. `.from()` would record the *current* value as its target,
      // and the current value is already 0 because the hidden state comes from
      // CSS. `clearProps` hands the transform back to CSS when the entrance is
      // done, so nothing inline outlives it.
      const arrive = (selector: string, rise: number, at: number, duration: number) => {
        const el = section.querySelector(selector);
        if (!el) return;
        intro.fromTo(
          el,
          { opacity: 0, y: rise },
          { opacity: 1, y: 0, duration, clearProps: "transform,willChange" },
          at,
        );
      };

      arrive("[data-about-reveal='label']", RISE.label, ENTRANCE.label, DURATION.fast);
      arrive("[data-about-reveal='tagline']", RISE.heading, ENTRANCE.tagline, DURATION.reveal);
      arrive("[data-about-reveal='thesis']", RISE.heading, ENTRANCE.thesis, DURATION.reveal);

      // The three paragraphs are the staggered group.
      const paragraphs = section.querySelectorAll("[data-about-reveal='paragraph']");
      paragraphs.forEach((el, index) => {
        intro.fromTo(
          el,
          { opacity: 0, y: RISE.body },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.reveal,
            clearProps: "transform,willChange",
          },
          ENTRANCE.paragraph1 + index * ENTRANCE.paragraph,
        );
      });

      arrive("[data-about-reveal='link']", RISE.link, ENTRANCE.link, DURATION.fast);

      // The image animates on its column wrapper, never on the figure. The
      // figure carries `-rotate-2`, and GSAP does not merge with Tailwind's
      // transform utilities — it writes its own `transform` inline and would
      // drop that tilt for good. Moving the column instead leaves the figure's
      // tilt, its `tape::before`, the white frame and the shadow entirely under
      // CSS, and the transient tilt here simply settles back to the authored
      // position.
      const column = section.querySelector("[data-about-column]");
      if (column) {
        intro.fromTo(
          column,
          { opacity: 0, y: RISE.column, rotation: COLUMN_TILT },
          {
            opacity: 1,
            y: 0,
            rotation: 0,
            duration: DURATION.editorial,
            clearProps: "transform,willChange",
          },
          ENTRANCE.column,
        );
      }

      // The caption follows the image it belongs to, rather than riding in with
      // the column.
      arrive("[data-about-reveal='caption']", RISE.caption, ENTRANCE.caption, DURATION.fast);
    } catch (error) {
      console.error("[about] entrance failed; revealing without animation", error);
      revealImmediately(section);
    }
  });

  return (
    <section
      id="about"
      ref={scopeRef}
      data-tone="light"
      className="paper-texture torn-edge-top relative bg-paper px-5 py-24 text-graphite md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div data-about-reveal="label">
          <SectionLabel tone="light">About</SectionLabel>
        </div>
        <p data-about-reveal="tagline" className="display-xl mt-6 text-[clamp(2rem,5vw,3.5rem)]">
          Not just a portfolio.
        </p>

        <div className="mt-16 grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <h2
              data-about-reveal="thesis"
              className="font-editorial text-[clamp(1.7rem,3vw,2.6rem)] leading-[1.2]"
            >
              I work at the intersection of product, data, and business systems, usually where the
              problem is still unclear and the path forward is not obvious.
            </h2>
            <div className="mt-10 max-w-xl space-y-6 border-l border-ember/60 pl-6 text-[1.05rem] leading-[1.75] text-graphite-dim">
              <p data-about-reveal="paragraph">
                My career has taken me through operations, analytics, team leadership, and product
                management. Over time, the work became less about producing reports and more about
                understanding how information, processes, and people fit together.
              </p>
              <p data-about-reveal="paragraph">
                I&rsquo;ve worked on global partner systems, analytics products, operational
                workflows, and decision tools used across different teams and functions. The common
                thread has been the same: take something complicated, create structure around it,
                and make it easier to use or act on.
              </p>
              <p data-about-reveal="paragraph">
                Outside work, I build my own product ideas and experiment with AI. This site is a
                mix of both.
              </p>
            </div>

            <a
              href="#experiments"
              data-about-reveal="link"
              className="link-arrow label-eyebrow mt-10 inline-flex text-graphite-dim transition-colors hover:text-ember-ink"
            >
              See what I&rsquo;m building <span className="arrow">→</span>
            </a>
          </div>

          <div data-about-column className="lg:col-span-5">
            <figure className="tape relative mx-auto max-w-sm -rotate-2 bg-white p-3 shadow-[0_28px_60px_-28px_oklch(0_0_0/0.35)]">
              <Picture
                avif={IGUANA_AVIF}
                webp={IGUANA_WEBP}
                fallback={iguana}
                alt="Terry crouching beside an iguana in a landscaped enclosure"
                width={1254}
                height={1254}
                sizes={IGUANA_SIZES}
                loading="lazy"
                className="w-full object-cover"
              />
              <figcaption
                data-about-reveal="caption"
                className="hand mt-3 text-2xl text-graphite-dim"
              >
                Different contexts.
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
