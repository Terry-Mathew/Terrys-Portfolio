import { profile } from "@/content/site";
import { Reveal, SectionLabel } from "./Reveal";

const links = [
  { label: "LinkedIn", href: profile.linkedin },
  { label: "Instagram", href: profile.instagram },
  { label: "YouTube", href: profile.youtube },
  { label: "Resume", href: profile.resume },
];

export function Contact() {
  return (
    <section
      id="contact"
      data-tone="dark"
      className="film-grain relative bg-ink px-5 pt-14 pb-7 md:px-10 md:pt-20 md:pb-8"
    >
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal>
          <SectionLabel>Contact</SectionLabel>
          <h2 className="mt-5 max-w-3xl font-editorial text-[clamp(2rem,5vw,3.6rem)] leading-[1.05] text-bone">
            Maybe we should build something.
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <a
            href={`mailto:${profile.email}`}
            className="link-arrow mt-6 inline-block font-sans text-base font-normal tracking-tight text-bone-dim underline decoration-bone/25 decoration-1 underline-offset-[6px] transition-colors hover:text-ember hover:decoration-ember/50 sm:text-[1.0625rem] md:text-lg"
          >
            {profile.email} <span className="arrow text-ember">→</span>
          </a>
        </Reveal>

        <Reveal delay={140}>
          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-8">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="label-eyebrow text-bone-dim transition-colors hover:text-ember"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <footer className="mt-10 flex flex-col gap-1.5 border-t border-bone/15 pt-5 text-bone-dim sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="hand text-lg sm:text-xl">
            Built somewhere between certainty and curiosity.
          </p>
          <p className="label-eyebrow">© {new Date().getFullYear()} Terry Mathew</p>
        </footer>
      </div>
    </section>
  );
}
