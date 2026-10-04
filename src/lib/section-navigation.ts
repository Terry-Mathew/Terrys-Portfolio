type SectionNavigationOptions = {
  window: Window;
  document: Document;
  header: HTMLElement | null;
  getHash: () => string;
  navigate: (hash: string) => Promise<void>;
  subscribe: (listener: (hash: string) => void) => () => void;
  onSelect: () => void;
};

/** Router history owns URLs; this controller owns section scroll and reading focus. */
export function installSectionNavigation(options: SectionNavigationOptions) {
  const { window: win, document: doc } = options;
  let frame = 0;
  let disposed = false;
  let previousHash = options.getHash();
  let selection = 0;
  const temporaryFocus = new Map<HTMLElement, () => void>();

  const findTarget = (hash: string) => {
    try {
      return doc.getElementById(decodeURIComponent(hash.replace(/^#/, "")) || "top");
    } catch {
      return null;
    }
  };

  const schedule = (hash: string, behavior: ScrollBehavior) => {
    if (disposed) return;
    if (frame) win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      const target = findTarget(hash);
      if (!target || target.hasAttribute("data-skip-target")) return;
      const focusTarget = target.querySelector<HTMLElement>("h1, h2") ?? target;
      if (!focusTarget.hasAttribute("tabindex")) {
        focusTarget.setAttribute("tabindex", "-1");
        const restore = () => {
          if (focusTarget.getAttribute("tabindex") === "-1") {
            focusTarget.removeAttribute("tabindex");
          }
          focusTarget.removeEventListener("blur", restore);
          temporaryFocus.delete(focusTarget);
        };
        temporaryFocus.set(focusTarget, restore);
        focusTarget.addEventListener("blur", restore, { once: true });
      }
      focusTarget.focus({ preventScroll: true });
      const offset = (options.header?.getBoundingClientRect().height ?? 0) + 16;
      const top = Math.max(0, target.getBoundingClientRect().top + win.scrollY - offset);
      const reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
      win.scrollTo({ top, behavior: reduce ? "auto" : behavior });
    });
  };

  const unsubscribe = options.subscribe((hash) => {
    // Leave plain homepage restoration to the router unless returning from a section.
    if (hash || previousHash) schedule(hash, "auto");
    previousHash = hash;
  });
  if (previousHash) schedule(previousHash, "auto");

  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const anchor = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (
      !anchor ||
      anchor.hasAttribute("data-skip-link") ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target !== "_self")
    ) {
      return;
    }
    const hash = anchor.getAttribute("href")!.slice(1);
    const target = findTarget(hash);
    if (!target) return;
    event.preventDefault();
    options.onSelect();
    const request = ++selection;
    void options.navigate(target.id).then(
      () => {
        if (request === selection) schedule(target.id, "smooth");
      },
      () => {
        if (request === selection) schedule(options.getHash(), "auto");
      },
    );
  };
  doc.addEventListener("click", onClick);

  return () => {
    disposed = true;
    unsubscribe();
    doc.removeEventListener("click", onClick);
    if (frame) win.cancelAnimationFrame(frame);
    for (const restore of temporaryFocus.values()) restore();
  };
}
