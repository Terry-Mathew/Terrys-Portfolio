import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

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
    try {
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
    } catch (error) {
      console.error("[reveal] setup failed; showing static content", error);
      setShown(true);
      return;
    }
  }, []);

  const Element = Tag as "div";

  // The hidden state is CSS, not an inline style, gated on `html.js` in
  // styles.css. An inline opacity:0 here would ship in the SSR HTML and leave
  // the whole page invisible when JavaScript is unavailable.
  const style = {
    "--reveal-y": `${y}px`,
    "--reveal-delay": `${delay}ms`,
  } as CSSProperties;

  return (
    <Element
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={className}
      data-reveal=""
      onFocusCapture={() => setShown(true)}
      {...(shown ? { "data-reveal-in": "" } : {})}
      style={style}
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
