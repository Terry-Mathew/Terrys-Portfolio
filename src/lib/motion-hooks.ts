import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

function useMediaQuery(query: string, serverValue: boolean) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function usePrefersReducedMotion() {
  // Hydration starts conservatively; the client snapshot reads the real preference.
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}

export function useIsDesktop(minWidth = 1024) {
  return useMediaQuery(`(min-width: ${minWidth}px)`, false);
}

/**
 * Smoothed, normalised pointer position (-1..1) updated on rAF.
 * Returns {x:0,y:0} on mobile or with reduced motion.
 */
export function useSmoothPointer() {
  const reduced = usePrefersReducedMotion();
  const isDesktop = useIsDesktop();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduced || !isDesktop) {
      setPos({ x: 0, y: 0 });
      return;
    }
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      target.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    const tick = () => {
      current.current = {
        x: current.current.x + (target.current.x - current.current.x) * 0.06,
        y: current.current.y + (target.current.y - current.current.y) * 0.06,
      };
      setPos({ x: current.current.x, y: current.current.y });
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduced, isDesktop]);

  return pos;
}

export function usePrimaryTouchInput() {
  return useMediaQuery("(pointer: coarse)", false);
}
