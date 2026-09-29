/**
 * Clamping for the client-supplied conversation.
 *
 * Separate from chat.ts on purpose: this is a security boundary, and it is
 * only worth a boundary if it can be tested without standing up the whole
 * Worker. It is also the one control the SSE route was missing — see the note
 * on sanitiseHistory below.
 */

import { CHAT_CONFIG } from "@/server/chat.config";

export type Turn = { role: "user" | "bot"; text: string };

/**
 * Clamp the client-supplied conversation to something safe to put in a prompt.
 *
 * The whole history array arrives from the browser, so it is untrusted input
 * like any other. Role is forced to a known value — anything that is not
 * "user" becomes "bot" — so a forged "system" role cannot impersonate the
 * instructions. Both the number of messages and the size of each are capped.
 *
 * This was applied only to `askChat`, the server function. The SSE route at
 * /api/chat — the path the live site actually uses — cast the client's array
 * straight to ChatTurn[] and passed it to runChat, so the limits existed in
 * config and did nothing on the route that mattered. Input tokens are billed,
 * which makes an uncapped history a cost attack as much as a robustness one.
 */
export const sanitiseHistory = (history: unknown): Turn[] =>
  Array.isArray(history)
    ? history
        .filter(
          (m): m is { role: string; text: string } =>
            typeof m === "object" &&
            m !== null &&
            typeof (m as { role?: unknown }).role === "string" &&
            typeof (m as { text?: unknown }).text === "string",
        )
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("bot" as const),
          text: m.text.slice(0, CHAT_CONFIG.security.maxHistoryItemLength),
        }))
        .slice(-CHAT_CONFIG.security.maxHistoryMessages)
    : [];

/** Total characters that can reach a prompt from the conversation. */
export const historyBudget = (): number =>
  CHAT_CONFIG.security.maxHistoryMessages * CHAT_CONFIG.security.maxHistoryItemLength;
