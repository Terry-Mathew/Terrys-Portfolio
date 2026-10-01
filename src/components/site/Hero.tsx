import { gsap } from "gsap";
import portraitSide from "@/assets/portrait-side.png";
import portraitAvif640 from "@/assets/portrait-side-640w.avif";
import portraitAvif1024 from "@/assets/portrait-side-1024w.avif";
import portraitAvif1672 from "@/assets/portrait-side-1672w.avif";
import portraitWebp640 from "@/assets/portrait-side-640w.webp";
import portraitWebp1024 from "@/assets/portrait-side-1024w.webp";
import portraitWebp1672 from "@/assets/portrait-side-1672w.webp";
import mountains from "@/assets/hero-mountains.jpg";
import mountainsAvif from "@/assets/hero-mountains-704w.avif";
import mountainsWebp from "@/assets/hero-mountains-704w.webp";
import { profile } from "@/content/site";
import { useIsDesktop } from "@/lib/motion-hooks";
import { DURATION, EASE, REVEAL } from "@/lib/motion";
import { useGsapContext } from "@/lib/useGsapContext";
import { Picture } from "./Picture";

// The portrait is 1672x941 with real transparency (59% of the frame), and it is
// the LCP image. On desktop it is sized by height, not width — the wrapper is
// h-[64svh] and the image is w-auto — so the rendered width is
// 64svh x (1672/941) = 113.7svh. vh units are valid in `sizes`, so this can be
// stated exactly instead of guessed at.
const PORTRAIT_AVIF = `${portraitAvif640} 640w, ${portraitAvif1024} 1024w, ${portraitAvif1672} 1672w`;
const PORTRAIT_WEBP = `${portraitWebp640} 640w, ${portraitWebp1024} 1024w, ${portraitWebp1672} 1672w`;
const PORTRAIT_SIZES = "(min-width: 64rem) 114vh, (min-width: 48rem) 24rem, 92vw";

const MOUNTAINS_AVIF = `${mountainsAvif} 704w`;
const MOUNTAINS_WEBP = `${mountainsWebp} 704w`;
const MOUNTAINS_SIZES = "(min-width: 64rem) 40vw, (min-width: 48rem) 62vw, 85vw";

/**
 * Scroll travel, in pixels, across one viewport of scrolling.
 *
 * The desktop column is the original React implementation's output, value for
 * value — swapping the mechanism must not change what the page looks like at any
 * scroll position. The mobile column is roughly half, because a phone has half
 * the viewport to travel through and a fifth of the budget for a per-frame
 * repaint.
 *
 * The portrait and the typography are 80px apart by the bottom of the range,
 * which is what keeps them reading as separate planes.
 */
const LAYER_TRAVEL = {
  desktop: { background: 14, mountains: -50, glow: -20, portrait: -30, type: -110, copy: -110 },
  mobile: { background: 7, mountains: -24, glow: -10, portrait: -16, type: -40, copy: -40 },
} as const;

/** Pointer travel, in pixels, at the extreme edge of the viewport. X only. */
const POINTER_X = { mountains: 4, portrait: -8 } as const;

/**
 * Entrance order. The portrait and the background run first and slowest so the
 * hero reads as resolving out of the dark rather than being wiped on; the
 * copy follows in reading order — eyebrow, name, what he does, then the two
 * ways in.
 */
const ENTRANCE = {
  glow: 0,
  mountains: 0,
  portrait: 0.05,
  eyebrow: 0,
  name1: 0.1,
  name2: 0.19,
  statement: 0.32,
  background: 0.4,
  cta1: 0.5,
  cta2: 0.56,
} as const;

/** How far a line of type rises as it arrives. Small on purpose. */
const RISE = {
  eyebrow: 8,
  name: 20,
  body: 16,
  cta: 12,
} as const;

export function Hero() {
  const isDesktop = useIsDesktop(1024);

  const scopeRef = useGsapContext(
    (context) => {
      // The hero is the only element with this id, so this is unambiguous, and it
      // runs once per setup rather than per frame. `context.selector()` is not
      // used here: it returns nothing useful at this point, because a GSAP
      // context has no selector until something inside it has been animated.
      // Every tween below still gets registered with the context, which is what
      // makes the cleanup total.
      const section = document.getElementById("top");
      if (!(section instanceof HTMLElement)) return;

      // ---- Scroll parallax ------------------------------------------------
      // One ScrollTrigger, one timeline, six tweens. The previous version
      // re-rendered this whole component on every scroll frame and every
      // pointer frame because the offsets lived in React state; here the
      // timeline writes six transforms directly and React never re-renders.
      const travel = isDesktop ? LAYER_TRAVEL.desktop : LAYER_TRAVEL.mobile;

      const parallax = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          // Reproduces the old `scrollY / innerHeight` clamped to 0..1.
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      for (const [name, distance] of Object.entries(travel)) {
        const el = section.querySelector(`[data-hero-layer="${name}"]`);
        if (!el) continue;
        // Starts at 0 and eases to `distance` with no easing, so the mapping
        // from scroll position to offset is identical to the old multiply.
        parallax.fromTo(el, { y: 0 }, { y: distance, duration: 1 }, 0);
      }

      // ---- Entrance -------------------------------------------------------
      // Both ends are stated explicitly rather than using `.from()`, which
      // records the *current* value as its target — and the current value is
      // already 0, because the hidden state comes from CSS.
      const intro = gsap.timeline({ defaults: { ease: EASE.out } });
      const arrive = (name: string, rise: number, at: number, duration: number) => {
        const el = section.querySelector(`[data-hero-reveal="${name}"]`);
        if (!el) return;
        intro.fromTo(
          el,
          { opacity: 0, y: rise },
          { opacity: 1, y: 0, duration, clearProps: "transform" },
          at,
        );
      };

      arrive("eyebrow", RISE.eyebrow, ENTRANCE.eyebrow, DURATION.fast);
      arrive("name-1", RISE.name, ENTRANCE.name1, DURATION.reveal);
      arrive("name-2", RISE.name, ENTRANCE.name2, DURATION.reveal);
      arrive("statement", RISE.body, ENTRANCE.statement, DURATION.reveal);
      arrive("background", RISE.body, ENTRANCE.background, DURATION.reveal);
      arrive("cta-1", RISE.cta, ENTRANCE.cta1, DURATION.fast);
      arrive("cta-2", RISE.cta, ENTRANCE.cta2, DURATION.fast);

      // Atmosphere first: it is what everything else is revealed against.
      for (const [name, at] of [
        ["glow", ENTRANCE.glow],
        ["mountains", ENTRANCE.mountains],
      ] as const) {
        const el = section.querySelector(`[data-hero-reveal="${name}"]`);
        if (!el) continue;
        intro.fromTo(
          el,
          { opacity: 0 },
          { opacity: 1, duration: DURATION.editorial, clearProps: "willChange" },
          at,
        );
      }

      // The portrait is the LCP image, so its mask starts first and finishes
      // early. A wipe from the bottom edge matches where the image already
      // bleeds off, so the mask reads as the silhouette resolving rather than
      // as a rectangle being revealed.
      const portrait = section.querySelector<HTMLElement>('[data-hero-mask="portrait"]');
      if (portrait) {
        intro.fromTo(
          portrait,
          { clipPath: REVEAL.clip },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: DURATION.editorial,
            // Clearing clipPath alone is not enough, and would in fact be a
            // trap: the hidden state lives in the stylesheet, so stripping the
            // inline value would let the closed mask fall back into place the
            // instant the reveal finished. The attribute takes the element out
            // of that stylesheet rule, then the inline value can go.
            onComplete: () => {
              portrait.setAttribute("data-hero-mask-done", "");
              gsap.set(portrait, { clearProps: "clipPath" });
            },
          },
          ENTRANCE.portrait,
        );
      }

      // ---- Pointer --------------------------------------------------------
      // X only. `y` belongs to the scroll timeline, and two systems writing the
      // same transform property would fight; verified that GSAP composes them, so
      // the portrait settles on translate3d(x, y, 0) with both intact.
      //
      // `quickSetter` writes straight through on each event instead of driving a
      // tween: the response is immediate, it does not depend on the frame ticker,
      // and no smoothing tween is left running between events. Pointer events
      // arrive often enough that the result reads as smooth, and a catch-up tween
      // would feel like lag on something meant to track the cursor.
      if (isDesktop && window.matchMedia("(hover: hover)").matches) {
        const mountainsEl = section.querySelector('[data-hero-layer="mountains"]');
        const portraitEl = section.querySelector('[data-hero-layer="portrait"]');
        const setMountainsX = mountainsEl
          ? (gsap.quickSetter(mountainsEl, "x", "px") as (v: number) => void)
          : null;
        const setPortraitX = portraitEl
          ? (gsap.quickSetter(portraitEl, "x", "px") as (v: number) => void)
          : null;

        if (setMountainsX || setPortraitX) {
          const onMove = (event: PointerEvent) => {
            const nx = (event.clientX / window.innerWidth) * 2 - 1;
            setMountainsX?.(nx * POINTER_X.mountains);
            setPortraitX?.(nx * POINTER_X.portrait);
          };

          // `context.add` does NOT mean "register this for cleanup". It invokes
          // the callback immediately and defers only the function that callback
          // *returns* (gsap-core: `result = func.apply(...); _isFunction(result)
          // && self._r.push(result)`). Passing a bare remove call therefore
          // detached the listener one tick after attaching it, and registered
          // nothing — which is exactly what happened: it moved nowhere.
          // So the subscription goes inside the callback and the teardown is
          // what gets returned, and the context runs it on revert — on unmount
          // and on a breakpoint change.
          context.add(() => {
            window.addEventListener("pointermove", onMove, { passive: true });
            return () => window.removeEventListener("pointermove", onMove);
          });
        }
      }
    },
    [isDesktop],
  );

  return (
    <section
      id="top"
      ref={scopeRef}
      data-tone="dark"
      className="film-grain relative isolate min-h-[100svh] overflow-hidden bg-ink"
    >
      {/* L1 background */}
      <div
        data-hero-layer="background"
        className="absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(90% 80% at 55% 35%, var(--ink-3) 0%, var(--ink) 70%)",
        }}
      />

      {/* L2 seamless cinematic landscape window, right side (desktop) */}
      <div
        data-hero-layer="mountains"
        data-hero-reveal="mountains"
        className="pointer-events-none absolute top-0 right-0 z-0 hidden h-full w-[40vw] max-w-[640px] lg:block 2xl:w-[36vw] 2xl:max-w-[760px] min-[1920px]:max-w-[820px]"
      >
        <Picture
          avif={MOUNTAINS_AVIF}
          webp={MOUNTAINS_WEBP}
          fallback={mountains}
          alt=""
          width={704}
          height={1408}
          sizes={MOUNTAINS_SIZES}
          className="h-full w-full object-cover opacity-75 2xl:opacity-65 min-[1920px]:opacity-55"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 12%, rgba(0,0,0,0.2) 24%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.72) 54%, rgba(0,0,0,0.92) 72%, #000 88%), linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, #000 26%, #000 70%, rgba(0,0,0,0.35) 88%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 12%, rgba(0,0,0,0.2) 24%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.72) 54%, rgba(0,0,0,0.92) 72%, #000 88%), linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, #000 26%, #000 70%, rgba(0,0,0,0.35) 88%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      </div>

      {/* L2 very large screens: gentle ink veil so the window never dominates */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[12vw] bg-gradient-to-l from-ink/60 to-transparent min-[1920px]:block" />

      {/* L2 mobile/tablet — faint atmospheric mountains, top-right */}
      <div className="pointer-events-none absolute top-0 right-0 z-0 h-[62svh] w-[85vw] md:h-[72svh] md:w-[62vw] lg:hidden">
        <Picture
          avif={MOUNTAINS_AVIF}
          webp={MOUNTAINS_WEBP}
          fallback={mountains}
          alt=""
          width={704}
          height={1408}
          sizes={MOUNTAINS_SIZES}
          className="h-full w-full object-cover opacity-30 md:opacity-40"
          style={{
            maskImage:
              "radial-gradient(90% 75% at 85% 40%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(90% 75% at 85% 40%, #000 0%, rgba(0,0,0,0.5) 45%, transparent 80%)",
          }}
        />
      </div>

      {/* L2b warm ambient sunset glow behind the silhouette */}
      <div
        data-hero-layer="glow"
        data-hero-reveal="glow"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(70%_36%_at_50%_82%,color-mix(in_oklab,var(--ember)_14%,transparent)_0%,transparent_72%)] lg:bg-[radial-gradient(48%_46%_at_62%_62%,color-mix(in_oklab,var(--ember)_16%,transparent)_0%,transparent_70%)]"
      />

      {/* L3 portrait — wide side profile, bleeding off the bottom */}
      <div
        data-hero-layer="portrait"
        data-hero-mask="portrait"
        className="pointer-events-none absolute bottom-0 left-[calc(50vw-38svh)] z-10 hidden h-[64svh] lg:block"
      >
        <Picture
          avif={PORTRAIT_AVIF}
          webp={PORTRAIT_WEBP}
          fallback={portraitSide}
          alt="Terry Mathew"
          width={1672}
          height={941}
          sizes={PORTRAIT_SIZES}
          fetchPriority="high"
          className="h-full w-auto max-w-none"
        />
      </div>

      {/* Header readability scrim — keeps nav, Resume and Let's Talk crisp */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[26svh] bg-gradient-to-b from-ink/90 via-ink/50 to-transparent" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end px-5 pt-28 pb-12 md:px-10 lg:justify-center lg:pb-16">
        {/* L5 giant type — sits beneath portrait in z, typographic block ~42% */}
        <div data-hero-layer="type" className="relative z-[5] lg:w-[46%]">
          <p data-hero-reveal="eyebrow" className="label-eyebrow text-bone-dim">
            {profile.role}
          </p>
          <h1 className="display-xl mt-4 text-[clamp(4rem,11.5vw,12rem)] leading-[0.82]">
            <span data-hero-reveal="name-1" className="block text-bone">
              Terry
            </span>
            <span data-hero-reveal="name-2" className="block text-bone-dim">
              Mathew
            </span>
          </h1>
        </div>

        {/* Text that must stay readable above the portrait */}
        <div data-hero-layer="copy" className="relative z-20 mt-7 max-w-md">
          <p
            data-hero-reveal="statement"
            className="font-editorial text-[clamp(1.05rem,1.5vw,1.3rem)] leading-[1.5] text-bone"
          >
            {profile.statement}
          </p>
          <p
            data-hero-reveal="background"
            className="mt-4 max-w-sm text-[0.95rem] leading-[1.7] text-bone-dim"
          >
            {profile.background}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a
              href="#experiments"
              data-hero-reveal="cta-1"
              className="link-arrow label-eyebrow text-bone transition-colors hover:text-ember"
            >
              <span className="grid size-10 place-items-center rounded-full border border-bone/40">
                ↓
              </span>
              Explore my work
            </a>
            <a
              href={profile.resume}
              data-hero-reveal="cta-2"
              className="link-arrow label-eyebrow text-bone-dim transition-colors hover:text-ember"
            >
              View resume <span className="arrow">↗</span>
            </a>
          </div>
        </div>

        {/* Mobile portrait, recomposed */}
        <div className="relative -mx-5 mt-8 lg:hidden">
          <Picture
            avif={PORTRAIT_AVIF}
            webp={PORTRAIT_WEBP}
            fallback={portraitSide}
            alt="Terry Mathew"
            width={1672}
            height={941}
            sizes={PORTRAIT_SIZES}
            loading="lazy"
            className="mx-auto w-full max-w-md object-contain"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-ink to-transparent" />
    </section>
  );
}
