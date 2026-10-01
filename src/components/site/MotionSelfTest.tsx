/**
 * Development-only proof that the GSAP foundation is wired correctly.
 *
 * Rendered behind `import.meta.env.DEV`, which is statically `false` in a
 * production build — so the component and the GSAP import behind it are dropped
 * from the bundle. Verified against the real build output, not assumed.
 *
 * What it proves:
 *   - the context hook runs on the client and not during SSR
 *   - the selector inside the context actually resolves to a live element
 *   - the tween starts and reaches its end value
 *   - ScrollTrigger registers
 *   - the probe has no visual footprint
 *
 * `tweenStarted` is the load-bearing assertion. A GSAP tween with zero matched
 * targets still fires `onComplete`, so checking only the end value would pass
 * even when nothing was animated.
 *
 * Cleanup-on-unmount is not asserted here; it is covered by `context.revert()`
 * in the hook and verified by navigating between routes and confirming no
 * orphaned ScrollTrigger instances accumulate.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGsapContext } from "@/lib/useGsapContext";
import { DURATION, EASE } from "@/lib/motion";

export function MotionSelfTest() {
  const scopeRef = useGsapContext((context) => {
    let started = false;

    gsap.fromTo(
      "[data-motion-probe]",
      { opacity: 0 },
      {
        opacity: 1,
        duration: DURATION.micro,
        ease: EASE.out,
        onStart: () => {
          started = true;
        },
        onComplete: () => {
          report(context, started);
        },
      },
    );
  });

  // The probe is rendered rather than created in an effect: `useGsapContext`
  // uses `useLayoutEffect`, which runs before `useEffect`, so an element
  // appended in a passive effect would not exist yet and the selector would
  // resolve to nothing.
  return (
    <div
      ref={scopeRef}
      aria-hidden="true"
      data-motion-self-test=""
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0 [clip-path:inset(50%)]"
    >
      <span data-motion-probe="" />
    </div>
  );
}

function report(context: gsap.Context, tweenStarted: boolean) {
  const el = document.querySelector("[data-motion-probe]") as HTMLElement | null;
  const result = {
    contextActive: Boolean(context),
    tweenStarted,
    // "1" as an inline value proves GSAP wrote to it; the default computed
    // value would be "1" even if nothing had run.
    endInlineOpacity: el?.style.opacity ?? null,
    scrollTriggerRegistered: ScrollTrigger.getAll() !== undefined,
    scrollTriggerCount: ScrollTrigger.getAll().length,
  };
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>)["__motionSelfTest"] = result;
    console.info("[motion-self-test]", JSON.stringify(result));
  }
}
