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
      const probe = document.elementsFromPoint(window.innerWidth / 2, 36);
      setOnPaper(probe.some((el) => el instanceof HTMLElement && el.dataset["tone"] === "light"));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Re-probe on resize + after reveal animations settle (same colours, no visual change).
    window.addEventListener("resize", onScroll);
    const t = window.setTimeout(update, 1000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(t);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const text = onPaper ? "text-graphite" : "text-bone";
  const dim = onPaper ? "text-graphite-dim" : "text-bone-dim";

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
                <a
                  href={l.href}
                  className={`label-eyebrow transition-colors hover:text-ember ${
                    l.label === "Home" ? "" : ""
                  }`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <a
              href={profile.resume}
              className={`label-eyebrow hidden whitespace-nowrap transition-colors hover:text-ember lg:inline ${dim}`}
            >
              Resume ↗
            </a>
            <a
              href="#contact"
              className={`link-arrow label-eyebrow hidden whitespace-nowrap rounded-full border px-4 py-2 transition-colors md:inline-flex ${
                onPaper
                  ? "border-graphite/25 text-graphite hover:border-ember hover:text-ember"
                  : "border-bone/25 text-bone hover:border-ember hover:text-ember"
              }`}
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
              className={`-m-2 grid size-11 place-items-center md:hidden ${text}`}
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
              className="-m-2 grid size-11 place-items-center"
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
          <a
            href={profile.resume}
            onClick={() => setOpen(false)}
            className="label-eyebrow mt-auto self-start text-bone-dim"
          >
            Resume ↗
          </a>
        </div>
      )}
    </>
  );
}
