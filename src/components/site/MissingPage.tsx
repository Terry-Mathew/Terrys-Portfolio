import { Link } from "@tanstack/react-router";

export function MissingPage({ title = "Page not found" }: { title?: string }) {
  return (
    <main
      id="main"
      data-skip-target
      tabIndex={-1}
      className="film-grain flex min-h-screen items-center justify-center bg-ink px-5 text-bone"
    >
      <meta name="robots" content="noindex" />
      <div className="max-w-md text-center">
        <p aria-hidden="true" className="display-xl text-8xl text-ember">
          404
        </p>
        <h1 className="display-xl mt-4 text-3xl text-bone">{title}</h1>
        <p className="mt-4 leading-relaxed text-bone-dim">
          This page is unavailable. Browse the projects or return to the homepage.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="label-eyebrow inline-flex min-h-11 items-center rounded-full border border-ember px-6 py-3 text-bone hover:bg-ember hover:text-ink"
          >
            Go home
          </Link>
          <Link
            to="/projects"
            className="label-eyebrow inline-flex min-h-11 items-center rounded-full border border-bone/30 px-6 py-3 text-bone hover:border-ember"
          >
            Browse projects
          </Link>
        </div>
      </div>
    </main>
  );
}
