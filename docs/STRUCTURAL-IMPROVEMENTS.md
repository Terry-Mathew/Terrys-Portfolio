# Structural improvements — implemented (design-locked)

## What changed
- Assets: `*.asset.json` Lovable pointers removed. Components import real binaries
  (`@/assets/*.webp|*.png|*.jpg`) directly — same layout, no `.url` indirection.
  Missing: `public/Terry-Mathew-CV.pdf` — add the real CV; resume links are placeholder-pathed.
- Lovable: `.lovable/` + `lovable-error-reporting.ts` deleted; `AGENTS.md`, `README.md`,
  `bunfig.toml` de-branded; `__root.tsx` uses generic `reportError`.
  `vite.config.ts` ejected to vanilla Vite (tailwind + tsconfig-paths + tanstackStart +
  nitro `cloudflare-module` + react + VITE_* injection + dedupe). `@lovable.dev/*` gone.
- Deps pruned (141 packages removed): all `@radix-ui/*`, `cmdk`, `embla`, `vaul`, `recharts`,
  `react-hook-form`, `zod`, `date-fns`, etc. Kept: tailwind, tanstack, react, lucide, clsx,
  tailwind-merge. Deleted `components.json`, `bun.lock`, `tw-animate-css` import.
- Redundancy: deleted `src/components/ui/*` (44 unused shadcn files), `src/hooks/`,
  `h.png/s0-s2.png` (~2.2MB). Kept `src/lib/utils.ts`.
- Fixes (no visual change): Nav deep-links preserved (`/#experience` works), resize re-probe,
  Hero `width/height` + `decoding`, Reveal ref type, Experiments keyed covers map.
- RAG chatbot (Cloudflare-native, static mode): `src/server/chat.ts` server function +
  `src/server/knowledge.ts` bundled KB (bio/oracle/work/settle/jannanayak/iconsherald/contact)
  + wired `ChatWidget.tsx` (input, suggested prompts, source anchors). Zero AI cost.
  Flip `CHAT_CONFIG.mode` to `"vector"` + uncomment wrangler bindings for Workers AI + Vectorize.

## Left for deploy
- Drop real `public/Terry-Mathew-CV.pdf`, real favicon/OG if wanted.
- `npx wrangler deploy` (Cloudflare Workers). Vectorize index `terry-portfolio-kb` + KV when
  upgrading chat to vector mode.
