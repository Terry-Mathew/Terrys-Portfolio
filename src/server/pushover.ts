// Outbound Pushover notifications. Server-only.
//
// This is a plain HTTPS POST from the Worker to the Pushover REST API, which
// then delivers to one phone. There is no subscription, no service worker and
// no VAPID key anywhere in this codebase — Pushover is not web push.
//
// The two values arrive as encrypted Worker secrets (`wrangler secret put`),
// never as `vars` in wrangler.jsonc, which would be plaintext in the repo.
// vite.config.ts also injects every VITE_* variable into the client bundle, so
// nothing secret may ever take that prefix.

import type { CloudflareEnvShape } from "@/server/env";

const ENDPOINT = "https://api.pushover.net/1/messages.json";

// Pushover rejects messages over 1024 characters. Truncate rather than fail.
const MAX_MESSAGE = 1000;

// Hard ceiling so a slow or hanging Pushover cannot hold the visitor's response
// open. Without it a network stall here is a stalled chatbot.
const TIMEOUT_MS = 5000;

/** -2 silent, -1 low, 0 normal, 1 high (bypasses quiet hours). */
export type PushPriority = -2 | -1 | 0 | 1;

export interface PushOptions {
  priority?: PushPriority;
  title?: string;
  url?: string;
  urlTitle?: string;
  sound?: string;
}

/**
 * Send one notification. Never throws.
 *
 * Every failure path returns false and logs. A Pushover outage is not allowed
 * to break the chatbot — the visitor asked a question, not for a phone
 * notification, so a failed push must degrade to silence.
 */
export async function sendPush(
  env: CloudflareEnvShape | undefined,
  message: string,
  opts: PushOptions = {},
): Promise<boolean> {
  const token = env?.PUSHOVER_TOKEN;
  const user = env?.PUSHOVER_USER;

  if (!token || !user) {
    console.info("[push] not configured — skipping notification");
    return false;
  }

  try {
    const body = new URLSearchParams({
      token,
      user,
      message: message.slice(0, MAX_MESSAGE),
      priority: String(opts.priority ?? 0),
    });
    if (opts.title) body.set("title", opts.title);
    if (opts.url) body.set("url", opts.url);
    if (opts.urlTitle) body.set("url_title", opts.urlTitle);
    if (opts.sound) body.set("sound", opts.sound);

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status !== 200) {
      console.warn(`[push] Pushover returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[push] failed (non-fatal):", e);
    return false;
  }
}
