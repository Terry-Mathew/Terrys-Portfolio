// Accessor for Cloudflare bindings under Nitro's `cloudflare-module` preset.
//
// The preset's fetch handler does two things: it sets `globalThis.__env__ = env`
// and it augments the incoming request with `request.runtime.cloudflare = { env,
// context }`. It does NOT populate `context.cloudflare.env`, which is the shape
// the `@cloudflare/vite-plugin` preset uses — so the two presets are not
// interchangeable and guessing wrong yields an empty env and a silent fallback
// to static keyword search.
//
// Probed in order, first hit wins, so this works under either preset.

export type CloudflareEnvShape = Record<string, unknown> & {
  VECTORIZE?: VectorizeIndex;
  DB?: D1Database;
  CACHE?: KVNamespace;
  AI?: Ai;
  ANTHROPIC_API_KEY?: string;
  GROQ_API_KEY?: string;
  INGEST_KEY?: string;
  /** Worker secret, never `vars` — anyone holding it can spam the phone. */
  PUSHOVER_TOKEN?: string;
  PUSHOVER_USER?: string;
  /** Plain `vars` in wrangler.jsonc. */
  ENVIRONMENT?: string;
};

type MaybeEnv = {
  cloudflare?: { env?: unknown };
  env?: unknown;
  runtime?: { cloudflare?: { env?: unknown } };
};

const looksLikeEnv = (value: unknown): value is CloudflareEnvShape =>
  typeof value === "object" && value !== null;

export function getCloudflareEnv(
  context?: unknown,
  request?: unknown,
): CloudflareEnvShape | undefined {
  // 1. Set by the preset's fetch handler on every request.
  const fromGlobal = (globalThis as { __env__?: unknown }).__env__;
  if (looksLikeEnv(fromGlobal)) return fromGlobal;

  // 2. h3 event context — @cloudflare/vite-plugin shape, and Nitro task context.
  const ctx = context as MaybeEnv | undefined;
  if (looksLikeEnv(ctx?.cloudflare?.env)) return ctx.cloudflare.env as CloudflareEnvShape;
  if (looksLikeEnv(ctx?.env)) return ctx.env as CloudflareEnvShape;

  // 3. The request object Nitro augments before handing it to the app.
  const req = request as MaybeEnv | undefined;
  if (looksLikeEnv(req?.runtime?.cloudflare?.env)) {
    return req.runtime!.cloudflare!.env as CloudflareEnvShape;
  }
  if (looksLikeEnv(req?.env)) return req.env as CloudflareEnvShape;

  return undefined;
}
