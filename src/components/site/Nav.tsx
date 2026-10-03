import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { profile } from "@/content/site";

const links = [
  { label: "Home", href: "#top" },
  { label: "Projects", href: "#experiments" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];
export function Nav() {
  const [open, setOpen] = useState(false);
  const [onPaper, setOnPaper] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = menuRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button") ?? []);
    focusables()[0]?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const openBtn = openBtnRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Close if the screen grows past the mobile breakpoint
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = prevOverflow;
      openBtn?.focus();
    };
  }, [open]);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    // Preserve deep links (e.g. /#experience): scroll to hash if present, else top.
    // Same smooth-scroll behaviour as before — no visual change.
    const hash = window.location.hash.slice(1);
    const target =
      hash === "" ? null : hash === "top" ? document.body : document.getElementById(hash);
    if (target) {
      requestAnimationFrame(() => {
        const y =
          target === document.body ? 0 : target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: y, behavior: "auto" });
      });
    } else if (!hash) {
      window.scrollTo(0, 0);
    }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      // The skip link opts out of this handler. It needs the browser's own
      // fragment navigation, which also moves focus onto #main — calling
      // preventDefault() here would scroll but leave focus behind.
      if (a.hasAttribute("data-skip-link")) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id === "top" ? document.body : document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const y = id === "top" ? 0 : el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 40);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Which section sits under the header decides whether the wordmark reads
  // light or dark. This was a document.elementsFromPoint() call on every
  // scroll frame, which is a forced style/layout query running 60x a second.
  //
  // An IntersectionObserver whose root is shrunk to a one-pixel band at the
  // same y answers the identical question, and only fires when the section
  // under the header actually changes. Both branches are written out in full
  // so the Tailwind scanner can see them.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-tone]"));
    if (!sections.length) return;

    const PROBE_Y = 36;
    let io: IntersectionObserver | undefined;

    const connect = () => {
      io?.disconnect();
      const hits = new Set<Element>();
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) hits.add(entry.target);
            else hits.delete(entry.target);
          }
          // Document order wins when a tall section and a short one occupy the
          // band at the same time.
          const active = sections.find((s) => hits.has(s));
          if (active) setOnPaper(active.dataset["tone"] === "light");
        },
        {
          // Collapse the viewport to a 1px band at PROBE_Y.
          rootMargin: `-${PROBE_Y}px 0px -${Math.max(0, window.innerHeight - PROBE_Y - 1)}px 0px`,
        },
      );
      for (const section of sections) io.observe(section);
    };

    connect();

    // The band is derived from innerHeight, so only a height change needs a
    // reconnect. A pure width change (dragging the window edge) does not.
    let lastHeight = window.innerHeight;
    const onResize = () => {
      if (window.innerHeight === lastHeight) return;
      lastHeight = window.innerHeight;
      connect();
    };
    window.addEventListener("resize", onResize);

    return () => {
      io?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const text = onPaper ? "text-graphite" : "text-bone";
  const dim = onPaper ? "text-graphite-dim" : "text-bone-dim";
  // --ember only reaches 2.62:1 on paper, so the hover state has to darken
  // with the surface. Written as two complete literals on purpose.
  const hoverAccent = onPaper
    ? "hover:border-ember-ink hover:text-ember-ink"
    : "hover:border-ember hover:text-ember";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          scrolled
            ? onPaper
              ? "bg-paper/85 backdrop-blur-md"
              : "bg-ink/80 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 md:px-10">
          <a href="#top" className={`hand shrink-0 whitespace-nowrap text-2xl md:text-3xl ${text}`}>
            Terry Mathew
          </a>

          <ul className={`hidden items-center gap-5 md:flex lg:gap-8 ${dim}`}>
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={`label-eyebrow transition-colors ${hoverAccent}`}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <a
              href="#contact"
              className={`link-arrow label-eyebrow hidden whitespace-nowrap rounded-full border px-4 py-2 transition-colors md:inline-flex ${
                onPaper ? "border-graphite/25 text-graphite" : "border-bone/25 text-bone"
              } ${hoverAccent}`}
            >
              Let's Talk <span className="arrow">→</span>
            </a>
            <button
              type="button"
              ref={openBtnRef}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(true)}
              className={`-m-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:bg-ember/15 md:hidden ${text}`}
            >
              <Menu className="size-6" />
            </button>
          </div>
        </nav>
      </header>

      {open && (
        <div
          id="mobile-menu"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-60 flex flex-col bg-ink px-6 py-5 text-bone md:hidden"
        >
          <div className="flex items-center justify-between">
            <span className="hand text-2xl">Terry Mathew</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="-m-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:bg-ember/15"
            >
              <X className="size-6" />
            </button>
          </div>
          <ul className="mt-16 space-y-7">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="display-xl block text-5xl text-bone"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
