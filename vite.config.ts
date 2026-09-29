// Vanilla Vite config — replaces @lovable.dev/vite-tanstack-config (removed).
// Equivalent plugin set, minus Lovable-only bits:
//   - TanStack Start (SSR, server entry src/server.ts) + React + Tailwind v4
//   - @ path alias via vite-tsconfig-paths, VITE_* env injection (Vite default)
//   - React/TanStack dedupe, lightningcss transformer
//   - Nitro cloudflare-module preset on production builds (was the Lovable default)
// Dropped (Lovable-only): devtools injection, sandbox detection, error-collector
// endpoint, __l5e assets proxy, prerender shims, HMR gate, exit watchdog.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode, command }) => {
  // Replicates the wrapper's VITE_* env define injection.
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // nitro/vite builds from this
        server: { entry: "server" },
      }),
      // Build-only: Cloudflare Workers target (matches previous default).
      ...(command === "build"
        ? [
            nitro({
              preset: "cloudflare-module",
              cloudflare: { nodeCompat: true, deployConfig: true },
            }),
          ]
        : []),
      react(),
    ],
    server: { host: "::", port: 8080 },
  };
});
