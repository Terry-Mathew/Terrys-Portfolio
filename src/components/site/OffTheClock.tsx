import { gsap } from "gsap";
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
import { EASE, REVEAL, onceOnScroll } from "@/lib/motion";
import { useGsapContext } from "@/lib/useGsapContext";
import { Picture } from "./Picture";
import { SectionLabel } from "./Reveal";

const MAHAD_AVIF = `${mahadAvif360} 360w, ${mahadAvif720} 720w`;
const MAHAD_WEBP = `${mahadWebp360} 360w, ${mahadWebp720} 720w`;

const BIRDS_AVIF = `${birdsAvif384} 384w, ${birdsAvif752} 752w`;
const BIRDS_WEBP = `${birdsWebp384} 384w, ${birdsWebp752} 752w`;
const PHOTO_SIZES = "(min-width: 64rem) 34rem, (min-width: 40rem) 80vw, 92vw";

const JOURNAL_PHOTOS = [
  {
    id: "birds",
    avif: BIRDS_AVIF,
    webp: BIRDS_WEBP,
    fallback: birds,
    alt: "Terry feeding colourful birds in a garden",
    width: 941,
    height: 1672,
    position: "center 34%",
    label: "A quiet moment with the birds",
    caption: "A quiet moment with the birds.",
  },
  {
    id: "fort",
    avif: MAHAD_AVIF,
    webp: MAHAD_WEBP,
    fallback: mahad,
    alt: "Terry sitting alone in a stone doorway at a basalt fort in Mahad, Maharashtra",
    width: 720,
    height: 1280,
    position: "center 52%",
    label: "History, written in stone",
    caption: "History, written in stone.",
  },
] as const;

export function OffTheClock() {
  const scopeRef = useGsapContext(() => {
    const section = document.getElementById("beyond-work");
    if (!(section instanceof HTMLElement)) return;

    const title = section.querySelector<HTMLElement>("[data-journal-title]");
    const pinRegion = section.querySelector<HTMLElement>("[data-journal-pin-region]");
    const stage = section.querySelector<HTMLElement>("[data-journal-stage]");
    const activeIndexLabel = section.querySelector<HTMLElement>("[data-journal-active-index]");
    const activeCaption = section.querySelector<HTMLElement>("[data-journal-active-caption]");
    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-journal-card]"));

    if (title) {
      gsap.fromTo(
        title,
        { clipPath: REVEAL.clip },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1,
          ease: EASE.out,
          clearProps: "clipPath",
          onComplete: () => title.setAttribute("data-journal-mask-done", ""),
          scrollTrigger: onceOnScroll(title),
        },
      );
    }

    if (!stage || !pinRegion || cards.length < 2) return;

    const responsive = gsap.matchMedia();
    responsive.add(
      "(min-width: 64rem) and (min-height: 44rem)",
      () => {
        const frames = cards
          .map((card, index) => ({
            card,
            frame: card.querySelector<HTMLElement>("[data-journal-photo-frame]"),
            index,
          }))
          .filter((item): item is typeof item & { frame: HTMLElement } => item.frame !== null);
        if (frames.length < 2) return;

        const count = frames.length;
        const activeCenter = 52;
        const stackSpacing = Math.min(17, 30 / (count - 1));
        const sequence = gsap.timeline({
          scrollTrigger: {
            trigger: pinRegion,
            start: "top top+=112",
            end: () =>
              `+=${Math.round(window.innerHeight * Math.max(1.15, (frames.length - 1) * 0.62))}`,
            pin: pinRegion,
            pinSpacing: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        frames.forEach(({ frame, index }) => {
          gsap.set(frame, {
            left: `${activeCenter + index * stackSpacing}%`,
            xPercent: -50,
            yPercent: -50 + index * 2,
            scale: 1 - index * 0.025,
          });
          gsap.set(cards[index], { zIndex: count - index });
        });

        let activeIndex = 0;
        const showActiveCaption = (progress: number) => {
          const nextIndex = Math.min(count - 1, Math.floor(progress * (count - 1) + 0.5));
          if (nextIndex === activeIndex) return;
          activeIndex = nextIndex;
          if (activeIndexLabel) {
            activeIndexLabel.textContent = `${String(nextIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
          }
          if (activeCaption) activeCaption.textContent = JOURNAL_PHOTOS[nextIndex].caption;
        };

        // Each photo gets one transition interval. Earlier photos recede
        // while the next photo moves to the front of the stack.
        for (let index = 0; index < count - 1; index += 1) {
          const current = frames[index].frame;
          const next = frames[index + 1].frame;
          const at = index;
          sequence.to(
            current,
            {
              left: `${activeCenter - (index + 1) * 15}%`,
              yPercent: -54,
              scale: 0.91,
              opacity: 0.86,
              ease: "none",
              duration: 1,
            },
            at,
          );
          sequence.to(
            next,
            {
              left: `${activeCenter}%`,
              yPercent: -50,
              scale: 1,
              opacity: 1,
              ease: "none",
              duration: 1,
            },
            at,
          );
          sequence.set(frames[index].card, { zIndex: 0 }, at + 0.5);
          sequence.set(frames[index + 1].card, { zIndex: count + index + 1 }, at + 0.5);
        }
        sequence.eventCallback("onUpdate", () => showActiveCaption(sequence.progress()));
        sequence.eventCallback("onReverseComplete", () => showActiveCaption(0));
      },
      section,
    );
  }, []);

  return (
    <section
      id="beyond-work"
      data-tone="light"
      className="paper-texture torn-edge-top journal-section relative overflow-x-clip bg-paper-2 px-5 text-graphite md:px-10"
    >
      <div ref={scopeRef} className="relative z-10 mx-auto max-w-[1500px]">
        <div data-journal-pin-region className="journal-pin-region">
          <header className="max-w-3xl">
            <SectionLabel tone="light">Beyond work</SectionLabel>
            <h2
              data-journal-title
              className="mt-6 font-editorial text-[clamp(2.6rem,6vw,5rem)] leading-none"
            >
              Off The Clock.
            </h2>
            <p className="hand mt-5 text-2xl text-graphite-dim sm:text-3xl">
              Different places. Same curiosity.
            </p>
          </header>

          <div data-journal-stage className="journal-stage">
            {JOURNAL_PHOTOS.map((photo, index) => (
              <figure key={photo.id} data-journal-card={photo.id} className="journal-card">
                <div data-journal-photo-frame className="journal-photo-frame">
                  <Picture
                    avif={photo.avif}
                    webp={photo.webp}
                    fallback={photo.fallback}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes={PHOTO_SIZES}
                    loading="lazy"
                    className="journal-photo"
                    style={{ objectPosition: photo.position }}
                  />
                </div>
                <p className="label-eyebrow journal-card-label">
                  {String(index + 1).padStart(2, "0")} / {photo.label}
                </p>
                <figcaption className="hand journal-caption">{photo.caption}</figcaption>
              </figure>
            ))}
            <div className="journal-active-caption" aria-live="polite" aria-atomic="true">
              <p data-journal-active-index className="label-eyebrow journal-progress">
                01 / {String(JOURNAL_PHOTOS.length).padStart(2, "0")}
              </p>
              <p data-journal-active-caption className="hand journal-caption">
                {JOURNAL_PHOTOS[0].caption}
              </p>
            </div>
          </div>
        </div>

        <a
          href={profile.instagram}
          target="_blank"
          rel="noreferrer"
          className="link-arrow label-eyebrow journal-instagram inline-flex min-h-11 items-center text-graphite transition-colors hover:text-ember-ink"
        >
          More life → Instagram <span className="arrow">↗</span>
        </a>
      </div>
    </section>
  );
}
