import { useEffect, useRef, useState } from "react";
import { dialogFocusTargets, wrapDialogFocus } from "@/lib/dialog-focus";
import { Menu, X } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { profile } from "@/content/site";
import { installSectionNavigation } from "@/lib/section-navigation";

const links = [
  { label: "Home", href: "#top" },
  { label: "Projects", href: "#experiments" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];
export function Nav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [onPaper, setOnPaper] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const restoreTriggerFocusRef = useRef(true);

  useEffect(() => {
    if (!open) return;
    restoreTriggerFocusRef.current = true;
    const panel = menuRef.current;
    const focusables = () => (panel ? dialogFocusTargets(panel) : []);
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
      if (panel) wrapDialogFocus(panel, e, document.activeElement);
    };
    // Close if the screen grows past the mobile breakpoint
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = prevOverflow;
      if (restoreTriggerFocusRef.current && openBtn?.getClientRects().length) openBtn.focus();
    };
  }, [open]);

  useEffect(
    () =>
      installSectionNavigation({
        window,
        document,
        header: headerRef.current,
        getHash: () => router.state.location.hash,
        navigate: (hash) =>
          router.navigate({
            to: "/",
            hash,
            search: true,
            resetScroll: false,
            hashScrollIntoView: false,
          }),
        subscribe: (listener) =>
          router.subscribe("onRendered", ({ toLocation }) => listener(toLocation.hash)),
        onSelect: () => {
          restoreTriggerFocusRef.current = false;
          setOpen(false);
        },
      }),
    [router],
  );

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
        ref={headerRef}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          scrolled
            ? onPaper
              ? "bg-paper/85 backdrop-blur-md"
              : "bg-ink/80 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-[1500px] min-w-0 items-center justify-between gap-4 px-5 py-4 md:px-10">
          <a href="#top" className={`hand min-w-0 text-xl sm:text-2xl md:text-3xl ${text}`}>
            Terry Mathew
          </a>

          <ul className={`hidden items-center gap-8 lg:flex ${dim}`}>
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={`label-eyebrow transition-colors ${hoverAccent}`}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-4">
            <a
              href="#contact"
              className={`link-arrow label-eyebrow hidden whitespace-nowrap rounded-full border px-4 py-2 transition-colors lg:inline-flex ${
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
              className={`-m-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:bg-ember/15 lg:hidden ${text}`}
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
          className="fixed inset-0 z-60 menu-safe-area flex flex-col overflow-y-auto overscroll-contain bg-ink px-6 py-5 text-bone lg:hidden"
        >
          <div className="flex shrink-0 items-center justify-between">
            <span className="hand min-w-0 text-xl sm:text-2xl">Terry Mathew</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="-m-2 grid size-11 place-items-center rounded-full transition-colors focus-visible:bg-ember/15"
            >
              <X className="size-6" />
            </button>
          </div>
          <ul className="mt-10 space-y-4 short:mt-5 short:space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="display-xl flex min-h-11 items-center text-4xl text-bone short:text-3xl"
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
