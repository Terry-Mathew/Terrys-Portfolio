# Terry Portfolio — agent notes

- Stack: TanStack Start (SSR) + React 19 + Vite + Tailwind CSS v4. No Lovable dependency.
- Deploy target: Cloudflare Workers (Nitro `cloudflare` preset). See `wrangler.jsonc` (placeholder — adjust before first deploy).
- Photo/print sizing that depends on window height (e.g. `experience-print`, `short:` variant) lives in `src/styles.css` as an `@utility`/`@custom-variant`, not as an arbitrary Tailwind value. Nested `calc()`/`min()` inside `w-[…]`/`h-[…]` is silently dropped by the compiler, and a caption inside a `w-fit` mount makes the mount size to the text instead of the photo. Keep the mount hugging the print and put long handwritten captions on the paper below it.
- Placeholders (owner to replace with real assets): `public/icon.svg`, `public/og-placeholder.svg`, `public/site.webmanifest`, `src/components/site/ChatWidget.tsx` (unwired RAG UI), `src/content/knowledge/*.md` (RAG source), `src/server/chat.config.ts`.
- Local assets: `src/assets/*.webp|*.png|*.jpg` are real binaries imported directly (no `.asset.json` pointers). Missing: `public/Terry-Mathew-CV.pdf` — resume links point there until the real file is added.


