# Terry Portfolio — agent notes

- Stack: TanStack Start (SSR) + React 19 + Vite + Tailwind CSS v4. No Lovable dependency.
- Deploy target: Cloudflare Workers (Nitro `cloudflare` preset). See `wrangler.jsonc` (placeholder — adjust before first deploy).
- Photo/print sizing that depends on window height (e.g. `experience-print`, `short:` variant) lives in `src/styles.css` as an `@utility`/`@custom-variant`, not as an arbitrary Tailwind value. Nested `calc()`/`min()` inside `w-[…]`/`h-[…]` is silently dropped by the compiler, and a caption inside a `w-fit` mount makes the mount size to the text instead of the photo. Keep the mount hugging the print and put long handwritten captions on the paper below it.
- Placeholders (owner to replace with real assets): `public/icon.svg`, `public/og-placeholder.svg`, `public/site.webmanifest`, `src/content/knowledge/*.md` (RAG source).
- `public/Terry-Mathew-CV.pdf` is present and is the resume target. `src/content/knowledge/resume.md` is generated from it by `scripts/extract-cv.mjs` on every build — edit the PDF, not the Markdown. `src/server/ingest.ts`'s `CATEGORY` map maps that file to the PDF as its source link.
- Source links in the chatbot are typed by hand into `CATEGORY` and were wrong three times before `scripts/pipeline-test.mjs` started checking each value against the section ids, routes and `public/` assets that actually exist. Adding a `.md` file without a valid `CATEGORY` entry falls back to the obvious `#knowledge` placeholder rather than a plausible-looking dead link.
