import { gsap } from "gsap";
import { profile } from "@/content/site";
import { DURATION, EASE, onceOnScroll } from "@/lib/motion";
import { useGsapContext } from "@/lib/useGsapContext";
import { SectionLabel } from "./Reveal";

const links = [
  { label: "LinkedIn", href: profile.linkedin },
  { label: "Instagram", href: profile.instagram },
  { label: "YouTube", href: profile.youtube },
];

/**
 * Entrance order. The section is the closing scene, so it is the shortest
 * sequence on the site — long enough to read as deliberate, short enough not to
 * hold anyone at the bottom of the page.
 *
 * The footer is included even though it never had a Reveal wrapper: it is
 * existing content in reading order, and leaving it static while everything
 * above it arrived would read as an oversight.
 */
const ENTRANCE = {
  label: 0,
  heading: 0.12,
  email: 0.3,
  socials: 0.44,
  footer: 0.58,
} as const;

/** How far each element rises as it arrives. */
const RISE = {
  label: 14,
  /** Matches About's 30px for the same clamp(2rem,5vw,3.6rem) serif size. */
  heading: 30,
  link: 16,
  footer: 12,
} as const;

/**
 * Fail open. The stylesheet hides these targets behind `html.js`, so a failed
 * timeline would leave the whole closing section unreadable. Stamping
 * `data-contact-failed` lets the stylesheet undo the gate in one step.
 */
function revealImmediately(section: Element | null) {
  if (!section) return;
  section.setAttribute("data-contact-failed", "");
  for (const el of section.querySelectorAll<HTMLElement>("[data-contact-reveal]")) {
    gsap.set(el, { clearProps: "opacity,transform,willChange" });
  }
}

export function Contact() {
  const scopeRef = useGsapContext(() => {
    const section = document.getElementById("contact");
    if (!(section instanceof HTMLElement)) return;

    try {
      const intro = gsap.timeline({
        defaults: { ease: EASE.out },
        scrollTrigger: onceOnScroll(section),
      });

      // Both ends are stated explicitly. `.from()` would record the current
      // value as its target, and the current value is already 0 because the
      // hidden state comes from the stylesheet.
      const arrive = (key: string, rise: number, at: number, duration: number) => {
        const el = section.querySelector(`[data-contact-reveal="${key}"]`);
        if (!el) return;
        intro.fromTo(
          el,
          { opacity: 0, y: rise },
          { opacity: 1, y: 0, duration, clearProps: "transform,willChange" },
          at,
        );
      };

      arrive("label", RISE.label, ENTRANCE.label, DURATION.fast);
      arrive("heading", RISE.heading, ENTRANCE.heading, DURATION.reveal);
      arrive("email", RISE.link, ENTRANCE.email, DURATION.reveal);
      arrive("socials", RISE.link, ENTRANCE.socials, DURATION.reveal);
      arrive("footer", RISE.footer, ENTRANCE.footer, DURATION.fast);
    } catch (error) {
      console.error("[contact] entrance failed; revealing without animation", error);
      revealImmediately(section);
    }
  });

  return (
    <section
      id="contact"
      ref={scopeRef}
      data-tone="dark"
      className="film-grain relative bg-ink px-5 pt-14 pb-7 md:px-10 md:pt-20 md:pb-8"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div data-contact-reveal="label">
          <SectionLabel>Contact</SectionLabel>
        </div>
        <h2
          data-contact-reveal="heading"
          className="mt-5 max-w-3xl font-editorial text-[clamp(2rem,5vw,3.6rem)] leading-[1.05] text-bone"
        >
          Start a conversation about the work.
        </h2>

        <div data-contact-reveal="email" className="mt-7">
          <p className="max-w-xl leading-relaxed text-bone-dim">
            For hiring teams, discuss a role in product, data, analytics, or applied AI. For project
            clients, discuss a data product, workflow, or AI prototype.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: "Discuss a role", subject: "Role discussion" },
              { label: "Discuss a project", subject: "Project discussion" },
            ].map((action) => (
              <a
                key={action.subject}
                href={`mailto:${profile.email}?subject=${encodeURIComponent(action.subject)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-bone/30 px-5 py-3 text-sm text-bone transition-colors hover:border-ember hover:text-ember"
              >
                {action.label}{" "}
                <span aria-hidden="true" className="ml-3">
                  ↗
                </span>
              </a>
            ))}
          </div>
          <a
            href={`mailto:${profile.email}`}
            className="link-arrow contact-email mt-6 inline-block font-sans text-base font-normal tracking-tight text-bone-dim underline decoration-bone/25 decoration-1 underline-offset-[6px] transition-colors hover:text-ember hover:decoration-ember/50 focus-visible:text-ember focus-visible:decoration-ember/50 sm:text-[1.0625rem] md:text-lg"
          >
            {profile.email}{" "}
            <span aria-hidden="true" className="contact-email__arrow arrow text-ember">
              →
            </span>
          </a>
        </div>

        <ul
          data-contact-reveal="socials"
          className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8"
        >
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="label-eyebrow inline-flex min-h-11 items-center text-bone-dim transition-colors hover:text-ember focus-visible:text-ember"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <footer
          data-contact-reveal="footer"
          className="mt-10 flex flex-col gap-1.5 border-t border-bone/15 pt-5 text-bone-dim sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <p className="hand text-lg sm:text-xl">
            Built somewhere between certainty and curiosity.
          </p>
          <p className="label-eyebrow">© {new Date().getFullYear()} Terry Mathew</p>
        </footer>
      </div>
    </section>
  );
}
