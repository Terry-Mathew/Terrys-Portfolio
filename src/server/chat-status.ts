// The one thing the chat window tells a visitor about its own health.
//
// Retrieval has always reported what it did, but only through fields nobody
// renders: `retrievalMode` on the done event, a console.info line, and a
// console.warn in the Worker logs. A visitor whose answer came from the
// extractive fallback because every provider tier was unavailable saw a chat
// that simply looked worse, with nothing to say so.
//
// This is a single TTL'd flag in KV, not a health endpoint. Deliberately not:
//  - a new public route to probe (an extra origin to keep alive, an extra thing
//    to authenticate or accidentally leave open), and
//  - a metric (a number a visitor cannot act on).
//
// What a visitor can act on is whether to expect a good answer right now.
//
// Failure mode, stated up front: a missing flag reads as "available". A false
// "Available" during a bad minute is the acceptable error here — the failure
// being guarded against is a dead chatbot that looks perfectly healthy.

import type { CloudflareEnvShape } from "@/server/env";

/**
 * Deliberately its own namespace.
 *
 * Retrieval caches live under `rag:v<corpus>:<hash>` and answers under
 * `chat:v<corpus>:p<prompt>:<hash>`. Both are versioned by corpus and prompt,
 * because both hold content that a corpus bump must retire. This flag holds no
 * content — it holds one word — so versioning it would only mean a corpus edit
 * silently clears a real outage. A fixed prefix keeps the three namespaces from
 * ever colliding.
 */
const DEGRADED_KEY = "chat:status:degraded";

/** Long enough to cover a visitor's whole visit, short enough to clear itself. */
export const STATUS_TTL_SECONDS = 600;

export type ChatHealth = {
  degraded: boolean;
};

/**
 * What the last turn that touched this Worker actually did.
 *
 * A miss — never written, expired, or KV unavailable — is "available". The read
 * is wrapped because it happens on the path that has to work, and a status
 * check that can fail a chat turn is worse than no status at all.
 */
export async function readChatHealth(env: CloudflareEnvShape | undefined): Promise<ChatHealth> {
  if (!env?.CACHE) return { degraded: false };
  try {
    const raw = await env.CACHE.get(DEGRADED_KEY, "text");
    return { degraded: raw !== null && raw !== "" };
  } catch (e) {
    console.warn("[status] health read failed, reporting available:", e);
    return { degraded: false };
  }
}

/**
 * Record the outcome of a turn, or clear it.
 *
 * Written by the chat route rather than by `runChat`, so the flag reflects what
 * the visitor was actually served — including the paths that return early, like
 * the rate-limit and blocked-keyword replies, which are available by any
 * measure.
 *
 * Never throws. A KV outage degrades this to "no status at all", which is not
 * a reason to fail a turn that already produced an answer.
 */
export async function recordChatHealth(
  env: CloudflareEnvShape | undefined,
  healthy: boolean,
): Promise<void> {
  if (!env?.CACHE) return;
  try {
    if (healthy) {
      await env.CACHE.delete(DEGRADED_KEY);
    } else {
      await env.CACHE.put(DEGRADED_KEY, "1", { expirationTtl: STATUS_TTL_SECONDS });
    }
  } catch (e) {
    console.warn("[status] health write failed, continuing:", e);
  }
}
