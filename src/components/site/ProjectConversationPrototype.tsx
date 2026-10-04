/** Local review prototype. Intentionally excluded from production routes. */
export function ProjectConversationPrototype() {
  return (
    <section aria-labelledby="conversation-prototype-title" className="bg-paper p-8 text-graphite">
      <p className="label-eyebrow text-ember-ink">Example conversation · Local prototype</p>
      <h2 id="conversation-prototype-title" className="display-xl mt-4 text-3xl">
        See the source behind the answer.
      </h2>
      <p className="mt-4">
        A fixed example explains the idea. This example does not run a model or retrieve live
        evidence.
      </p>
      <details className="mt-8 border-t border-graphite/20 py-5">
        <summary className="cursor-pointer font-editorial text-xl">
          How does this portfolio assistant find relevant information?
        </summary>
        <div className="mt-5 space-y-4 leading-relaxed">
          <p>
            The assistant searches curated Markdown passages by meaning and keywords. The server
            combines both rankings before generation.
          </p>
          <a
            className="link-arrow underline"
            href="/projects/digital-twin"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the implementation story →
          </a>
          <p className="text-sm text-graphite-dim">
            This example describes the portfolio codebase. It does not prove current response
            quality or service availability.
          </p>
        </div>
      </details>
      <p className="mt-5 text-sm text-graphite-dim">
        The static case study keeps the same facts visible without this control.
      </p>
    </section>
  );
}
