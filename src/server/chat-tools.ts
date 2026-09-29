// Lead capture for the chat, via tool calling.
//
// The model decides *when* to ask for contact details by reading the tool
// descriptions — that description is the only lever it has. Nothing here ever
// pushes without a deterministic guard passing first.
//
// Provider note: tool calling is wired through Groq (OpenAI-compatible).
// Workers AI's llama-3.3-70b is recorded in this project's own history as
// unreliable for structured tool calls, and Anthropic is the opt-in premium
// text path. So Groq is the tool-capable tier, and the plain-text chain
// remains the fallback for when Groq is absent or down.

import type { CloudflareEnvShape } from "@/server/env";
import { buildUserCorpus, rejectionMessage, validateContactEmail } from "@/server/email-guard";
import { sendPush } from "@/server/pushover";
import { CHAT_CONFIG } from "@/server/chat.config";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "record_user_details",
      description:
        "Record a visitor's contact details so Terry can follow up. Call this " +
        "ONLY after the visitor has explicitly given you their name and email " +
        "address themselves — usually in response to you asking how to reach " +
        "them. Never construct, guess, complete or infer an address: if the " +
        "visitor has not typed one, ask them for one instead.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "The visitor's email address, exactly as they typed it",
          },
          name: { type: "string", description: "The visitor's name" },
          notes: {
            type: "string",
            description: "One or two sentences on what they want to discuss or asked about",
          },
        },
        required: ["email", "name", "notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_unknown_question",
      description:
        "Record a question you could not answer from the context, so Terry can " +
        "fill the gap. Call this when the visitor asks something genuinely " +
        "outside your knowledge, not when you simply need more detail.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question that could not be answered" },
        },
        required: ["question"],
      },
    },
  },
];

export type ToolCall = { id: string; name: string; args: Record<string, unknown> };

const MAX_QUESTION_CHARS = 400;

/**
 * Recover a tool call that arrived as plain text.
 *
 * Some providers emit the JSON as content instead of a structured
 * tool_calls field. Without this, a perfectly valid call is silently dropped
 * and the lead is lost. The guard still has to pass either way — this recovers
 * the *transport*, it does not lower the bar.
 */
export function parseToolCallFromText(text: string): ToolCall | null {
  if (!text) return null;
  const candidates: string[] = [];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) candidates.push(fenced[1]);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (typeof parsed !== "object" || parsed === null) continue;
      const rec = parsed as Record<string, unknown>;
      // Accept both the bare argument object and a wrapped {name, arguments}.
      const name =
        typeof rec["name"] === "string"
          ? rec["name"]
          : typeof rec["tool"] === "string"
            ? rec["tool"]
            : null;
      const rawArgs = rec["arguments"] ?? rec["parameters"] ?? rec;
      if (!name || typeof rawArgs !== "object" || rawArgs === null) continue;
      if (name !== "record_user_details" && name !== "record_unknown_question") continue;
      return { id: "text-parsed", name, args: rawArgs as Record<string, unknown> };
    } catch {
      // Not JSON, or not a tool call. Try the next candidate.
    }
  }
  return null;
}

// --- per-visitor limits -----------------------------------------------------
//
// Without these, one person can call record_unknown_question twenty times a
// minute and fill the phone. A blocked keyword is a single word to type, and
// notifying on those is an attacker's spam button, so those log only.
//
// Counters live in KV. It is eventually consistent, which is fine here: the
// worst case is the same lead arriving twice a few seconds apart, which is not
// worth a D1 migration. It would not be acceptable for billing.

async function withinPerIpLimit(
  env: CloudflareEnvShape,
  ip: string,
  bucket: string,
  limit: number,
): Promise<boolean> {
  const cache = env.CACHE;
  if (!cache) return true; // no KV bound — fail open, the guard still applies
  const key = `push:${bucket}:${ip}`;
  try {
    const current = Number((await cache.get(key)) ?? "0") || 0;
    if (current >= limit) {
      console.warn(`[push] per-IP cap reached for ${bucket} (${current}/${limit}) — suppressing`);
      return false;
    }
    await cache.put(key, String(current + 1), { expirationTtl: 3600 });
    return true;
  } catch (e) {
    console.warn("[push] rate-limit check failed, allowing:", e);
    return true;
  }
}

async function isDuplicate(env: CloudflareEnvShape, fingerprint: string): Promise<boolean> {
  const cache = env.CACHE;
  if (!cache) return false;
  const key = `push:dedup:${fingerprint}`;
  try {
    if (await cache.get(key)) return true;
    await cache.put(key, "1", { expirationTtl: 86400 });
    return false;
  } catch {
    return false;
  }
}

const fingerprint = (email: string, name: string): string =>
  `${email.toLowerCase()}|${name.trim().toLowerCase()}`.replace(/[^a-z0-9@.|+_-]/g, "");

/** Alias so the tool layer reads as a unit; it is the Worker's own env shape. */
export type ToolEnv = CloudflareEnvShape;

/**
 * Execute one tool call and return the tool-result payload handed back to the
 * model. Also performs the push, if the guards pass.
 *
 * The result is always JSON the model can read. Rejections are expressed as a
 * tool error so the model re-asks the visitor; the visitor never learns that a
 * guard ran.
 */
export async function runToolCall(
  call: ToolCall,
  messages: readonly { role: string; content: string | null | undefined }[],
  env: ToolEnv | undefined,
  ip: string,
): Promise<{ output: Record<string, unknown>; pushed: boolean }> {
  // The corpus is built from user turns ONLY — never from the system prompt
  // and never from retrieved RAG context. See buildUserCorpus.
  const corpus = buildUserCorpus(messages);

  if (call.name === "record_user_details") {
    const email = typeof call.args["email"] === "string" ? call.args["email"] : "";
    const name = typeof call.args["name"] === "string" ? call.args["name"].trim() : "";
    const notes = typeof call.args["notes"] === "string" ? call.args["notes"].trim() : "";

    const verdict = validateContactEmail(email, corpus);
    if (!verdict.ok) {
      console.warn(`[push] contact rejected (${verdict.reason})`);
      return {
        output: { success: false, error: rejectionMessage(email, verdict.reason) },
        pushed: false,
      };
    }

    if (!name) {
      return {
        output: {
          success: false,
          error: "No name was provided. Ask the visitor for their name first.",
        },
        pushed: false,
      };
    }

    if (notes.length < CHAT_CONFIG.notifications.minNotesLength) {
      // Models fire this tool eagerly, on the first "tell me about yourself".
      // Without a real note there is nothing to follow up on.
      return {
        output: {
          success: false,
          error: `The notes field needs at least ${CHAT_CONFIG.notifications.minNotesLength} characters describing what the visitor wants. Ask them what they are looking for first.`,
        },
        pushed: false,
      };
    }

    const fp = fingerprint(email, name);
    if (env && (await isDuplicate(env, fp))) {
      console.info("[push] duplicate contact suppressed");
      return { output: { success: true, message: "Contact already recorded." }, pushed: false };
    }

    if (
      env &&
      !(await withinPerIpLimit(
        env,
        ip,
        "contact",
        CHAT_CONFIG.notifications.maxContactsPerIpPerHour,
      ))
    ) {
      return { output: { success: true, message: "Contact noted." }, pushed: false };
    }

    const pushed = env
      ? await sendPush(
          env,
          `New contact via the site chat.\n\nName: ${name}\nEmail: ${email.trim()}\nNotes: ${notes}`,
          { priority: 1, title: "Lead captured" },
        )
      : false;

    return {
      output: pushed
        ? { success: true, message: "Contact recorded and Terry has been notified." }
        : { success: true, message: "Contact recorded." },
      pushed,
    };
  }

  if (call.name === "record_unknown_question") {
    const question = typeof call.args["question"] === "string" ? call.args["question"].trim() : "";
    if (!question)
      return { output: { success: false, error: "No question supplied." }, pushed: false };

    if (
      env &&
      !(await withinPerIpLimit(
        env,
        ip,
        "unknown",
        CHAT_CONFIG.notifications.maxUnknownPerIpPerHour,
      ))
    ) {
      return { output: { success: true }, pushed: false };
    }

    const pushed = env
      ? await sendPush(env, `Unanswered question:\n${question.slice(0, MAX_QUESTION_CHARS)}`, {
          priority: 0,
          title: "Knowledge gap",
        })
      : false;

    return { output: { success: true }, pushed };
  }

  return { output: { success: false, error: `Unknown tool: ${call.name}` }, pushed: false };
}
