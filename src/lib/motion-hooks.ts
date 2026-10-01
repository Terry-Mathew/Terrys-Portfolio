import { useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    setIsDesktop(mq.matches);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minWidth]);
  return isDesktop;
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
