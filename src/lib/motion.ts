/**
 * Shared motion system.
 *
 * Deliberately small. These are values and three helpers, not a framework —
 * every duration, distance and easing decision on this site should be one of
 * these so that motion stays consistent and reviewable.
 *
 * Two rules this file exists to enforce:
 *
 *   1. Animate `transform` and `opacity` only. Both are compositor-friendly and
 *      neither can move a neighbouring element, so animating with them cannot
 *      cause layout shift.
 *   2. Every value is a constant. Nothing here reads `window`, `document` or
 *      any user preference at module scope, so this file is safe to import
 *      during server rendering.
 */

import { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * GSAP exposes its variable types off the `gsap` namespace and off the
 * ScrollTrigger class rather than as top-level named exports, so they are
 * referenced through those names here.
 */
type MotionVars = gsap.TweenVars;
type ScrollVars = ScrollTrigger.Vars;

/**
 * Durations in seconds, matching the bands the site already uses:
 * interactions under 300ms, reveals 500-900ms, editorial moves 900-1400ms.
 *
 * `standard` is 0.9 because that is the duration the CSS `[data-reveal]`
 * transition already ships with — a GSAP reveal replacing a CSS one should not
 * change the pace of the page.
 */
export const DURATION = {
  /** Hover, focus and other direct feedback. */
  micro: 0.2,
  /** State changes that need a beat more than a hover. */
  fast: 0.3,
  /** A block of content arriving. */
  reveal: 0.7,
  /** Matches the existing CSS reveal duration. */
  standard: 0.9,
  /** Editorial transitions — the slow ones. */
  editorial: 1.2,
} as const;

/**
 * GSAP eases, not CSS curves. `power2.out` is
 * `cubic-bezier(0.215, 0.61, 0.355, 1)` — the same curve as the site's
 * `cubic-bezier(0.22, 0.61, 0.36, 1)` to within a rounding error, so GSAP
 * motion and CSS motion decelerate identically.
 */
export const EASE = {
  /** The default for anything entering the viewport. */
  out: "power2.out",
  /** For movement that both enters and leaves. */
  inOut: "power2.inOut",
  /** For movement leaving the viewport. */
  in: "power2.in",
} as const;

/**
 * Shared reveal geometry. `y` matches the 28px the CSS reveal already uses, so
 * converting a reveal from CSS to GSAP is visually neutral.
 */
export const REVEAL = {
  /** Vertical offset a block travels while fading in. */
  y: 28,
  /** Delay between siblings in a staggered reveal. */
  stagger: 0.08,
  /**
   * Ceiling on the accumulated stagger. A 12-item list at `stagger` would take
   * ~1s to finish revealing, which reads as lag rather than rhythm.
   */
  maxStagger: 0.4,
  /** How far a photograph starts scaled up before settling. Keep it small. */
  imageScale: 1.04,
  /** Photographs are revealed by wiping a mask rather than by fading. */
  clip: "inset(0% 0% 100% 0%)",
} as const;

/** Values for the slow, scroll-linked transitions. */
export const EDITORIAL = {
  /** Vertical travel for a scroll-linked drift, in pixels. */
  drift: 60,
  /**
   * Scroll-linked movement is scaled down on small screens: less viewport, less
   * travel, and less battery to move it.
   */
  mobileDrift: 24,
  /** Horizontal travel for a scroll-linked drift, in pixels. */
  driftX: 40,
} as const;

/** Multipliers for narrowing motion on small or low-motion viewports. */
export const INTENSITY = {
  mobile: 0.5,
  /** Applied when the viewport is short, where vertical room is scarce. */
  short: 0.6,
} as const;

/**
 * ScrollTrigger positions, as strings.
 *
 * `revealStart` is derived from the `rootMargin` the IntersectionObserver
 * reveal in `Reveal.tsx` already uses ("-8% 0px -12% 0px"), which means "reveal
 * once the element's top passes 92% down the viewport". Matching it exactly
 * means a GSAP reveal fires where a CSS reveal fired.
 */
export const SCROLL = {
  revealStart: "top 92%",
  revealEnd: "bottom 8%",
  /** For triggers that should fire when the element is centred. */
  center: "center center",
} as const;

/**
 * ScrollTrigger options shared by one-shot reveals.
 *
 * `once: true` is deliberate: the existing reveals fire a single time, and a
 * repeating trigger would keep a ScrollTrigger alive for the life of the page.
 */
export function onceOnScroll(trigger: string | Element, extra: ScrollVars = {}) {
  return {
    trigger,
    start: SCROLL.revealStart,
    once: true,
    ...extra,
  } satisfies ScrollVars;
}

/**
 * Clamps a stagger so a long list cannot accumulate an unbounded delay.
 * Keeps the "restrained, editorial" pacing the brief asks for.
 */
export function staggerFor(count: number): number {
  if (count <= 1) return 0;
  return Math.min(REVEAL.stagger, REVEAL.maxStagger / (count - 1));
}

/**
 * The one content-reveal pattern: fade up into place.
 *
 * Returns the tween so callers can chain or inspect it. Under reduced motion
 * call `fadeIn` instead — this deliberately moves things.
 */
export function fadeUp(
  targets: gsap.TweenTarget,
  options: MotionVars = {},
): gsap.core.Tween | undefined {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, y: REVEAL.y },
    {
      autoAlpha: 1,
      y: 0,
      duration: DURATION.reveal,
      ease: EASE.out,
      // Clear the hint once the move is done. `will-change` on a permanently
      // promoted element costs memory for no benefit.
      clearProps: "willChange",
      ...options,
    },
  );
}

/**
 * Opacity-only counterpart to `fadeUp`, and the correct choice when reduced
 * motion is on: no movement, short duration, nothing for vestibular
 * sensitivities to react to.
 */
export function fadeIn(
  targets: gsap.TweenTarget,
  options: MotionVars = {},
): gsap.core.Tween | undefined {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: DURATION.fast,
      ease: EASE.out,
      clearProps: "willChange",
      ...options,
    },
  );
}

/**
 * The photographic reveal: a soft mask wipe with the image settling out of a
 * slight scale-up. Used for personal photography, where a plain fade reads as
 * cheap and a wipe reads as printed.
 */
export function imageReveal(
  targets: gsap.TweenTarget,
  options: gsap.TimelineVars = {},
): gsap.core.Timeline | undefined {
  return gsap.timeline({ defaults: { ease: EASE.out }, ...options }).fromTo(
    targets,
    { clipPath: REVEAL.clip, scale: REVEAL.imageScale },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      scale: 1,
      duration: DURATION.editorial,
      // The mask is what created the effect; leaving it on would keep a
      // compositing layer alive for the rest of the page's life.
      clearProps: "clipPath,willChange",
    },
    0,
  );
}
