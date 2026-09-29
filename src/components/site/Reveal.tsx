import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealTag = "div" | "section" | "li" | "article" | "figure" | "header";

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: RevealTag;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-8% 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Element = Tag as "div";

  return (
    // Same timing/classes as before — ref type fixed, no visual change.
    <Element
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(0, ${y}px, 0)`,
        transition: `opacity 900ms cubic-bezier(0.22,0.61,0.36,1) ${delay}ms, transform 900ms cubic-bezier(0.22,0.61,0.36,1) ${delay}ms`,
        willChange: shown ? undefined : "opacity, transform",
      }}
    >
      {children}
    </Element>
  );
}

export function SectionLabel({
  children,
  tone = "dark",
}: {
  index?: string;
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <div
      className={`label-eyebrow flex items-center gap-3 ${
        tone === "dark" ? "text-bone-dim" : "text-graphite-dim"
      }`}
    >
      <span className="h-px w-8 bg-ember" />
      <span>{children}</span>
    </div>
  );
}
