import { Link } from "@tanstack/react-router";
import { profile } from "@/content/site";

export function ProjectNavigation() {
  return (
    <header data-print-hide className="border-b border-bone/15 bg-ink px-5 text-bone md:px-10">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
        <Link to="/" className="hand inline-flex min-h-11 items-center text-2xl md:text-3xl">
          Terry Mathew
        </Link>
        <nav aria-label="Project navigation">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li>
              <Link
                to="/"
                className="label-eyebrow inline-flex min-h-11 items-center text-bone-dim transition-colors hover:text-ember"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/projects"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-bone", "aria-current": "page" }}
                className="label-eyebrow inline-flex min-h-11 items-center text-bone-dim transition-colors hover:text-ember"
              >
                Projects
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="contact"
                className="label-eyebrow inline-flex min-h-11 items-center text-bone-dim transition-colors hover:text-ember"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function ProjectClosing() {
  return (
    <footer
      data-print-hide
      className="border-t border-graphite/20 bg-paper-2 px-5 py-16 text-graphite md:px-10 md:py-24"
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-8">
        <div>
          <p className="label-eyebrow text-ember-ink">Continue the conversation</p>
          <h2 className="mt-4 max-w-xl font-editorial text-3xl leading-snug md:text-4xl">
            Have a role or a project in mind?
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Discuss a role", subject: "Role discussion" },
            { label: "Discuss a project", subject: "Project discussion" },
          ].map((action) => (
            <a
              key={action.subject}
              href={`mailto:${profile.email}?subject=${encodeURIComponent(action.subject)}`}
              className="link-arrow inline-flex min-h-11 items-center gap-3 rounded-full border border-graphite/25 px-5 py-3 text-sm transition-colors hover:border-ember-ink hover:text-ember-ink"
            >
              {action.label}{" "}
              <span className="arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
