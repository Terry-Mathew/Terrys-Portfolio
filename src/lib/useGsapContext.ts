/**
 * The single place GSAP touches the DOM.
 *
 * Every animated component on this site should set up its animations inside
 * this hook rather than calling `gsap.*` in its own effect. That buys three
 * things a hand-rolled effect does not:
 *
 *   1. Teardown is automatic and complete. `gsap.context()` records every
 *      tween, timeline and ScrollTrigger created inside it, and `revert()`
 *      removes them — including reverting the inline styles they wrote. A
 *      plain effect has to remember to call `.kill()` on each one, and misses
 *      the inline styles.
 *   2. Nothing runs on the server. `useLayoutEffect` does not execute during
 *      SSR, and the reduced-motion check short-circuits before any plugin is
 *      registered.
 *   3. Breakpoint-specific work goes through `matchMedia()`, which reverts its
 *      own context when the query stops matching — so a resize that crosses the
 *      desktop/mobile threshold tears down the desktop animations instead of
 *      stacking a second set on top.
 */

import { useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "./motion-hooks";

/**
 * `registerPlugin` is idempotent but not free, and the module may be evaluated
 * once per SSR request plus once per browser session. Guarding it keeps the
 * client from repeating the work on every component mount.
 */
let pluginRegistered = false;

function ensureScrollTrigger(): void {
  if (pluginRegistered) return;
  gsap.registerPlugin(ScrollTrigger);
  pluginRegistered = true;
}

/** Scope the selector targets in `setup` resolve against. */
type MotionScope = HTMLElement | null;

/**
 * Runs `setup` inside a GSAP context scoped to the returned ref, and reverts
 * that context on unmount or whenever `deps` change.
 *
 * `setup` is not called when the user prefers reduced motion — the animation is
 * never constructed, so it costs nothing and there is no possibility of a
 * leftover inline style. Use {@link useIsDesktop} plus `matchMedia` inside
 * `setup` when behaviour also depends on the viewport.
 *
 * @param scopeRef attach the returned ref to the element that owns the animated
 *   children. Selectors passed to GSAP are resolved within it.
 * @returns the same ref, for convenient use as a `ref` attribute.
 */
export function useGsapContext(
  setup?: (context: gsap.Context) => void,
  deps: DependencyList = [],
  scopeRef?: RefObject<HTMLDivElement | null>,
): RefObject<HTMLDivElement | null> {
  const localRef = useRef<HTMLDivElement | null>(null);
  const ref = scopeRef ?? localRef;
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const scope: MotionScope = ref.current;
    if (!scope) return;
    if (reduced) return;

    ensureScrollTrigger();

    const context = gsap.context((self) => {
      setup?.(self);
    }, scope);

    // ScrollTrigger measures the document, so anything that changes layout
    // after this point needs a refresh. Called once here rather than on every
    // scroll frame.
    ScrollTrigger.refresh();

    return () => {
      // `revert()` is the important part: it kills the tweens and restores the
      // inline styles GSAP wrote. A `kill()` alone would leave them behind.
      context.revert();
    };
    // `setup` is intentionally not a dependency. Callers pass the animation
    // arguments they want to vary, and re-running on an identity change of a
    // closure would rebuild every animation on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ref, ...deps]);

  return ref;
}
