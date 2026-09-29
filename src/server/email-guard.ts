// Deterministic validation for a visitor-supplied contact email.
//
// This is the last line of defence, and it must not depend on the model
// cooperating. A prompt instruction is a request; a regex is a fact.
//
// The failure this exists to prevent: the model invents a plausible address
// for a visitor who never gave one, and a phone notification goes out for a
// person who does not exist. That happened on the previous implementation.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/**
 * Substrings that mark an address as not-real. Deliberately generous: a false
 * reject costs one clarifying question, a false accept costs a spam call.
 */
const PLACEHOLDER_PARTS = [
  "example.com",
  "example.org",
  "example.net",
  "example",
  "test.com",
  "email.com",
  "domain.com",
  "yourname",
  "your-email",
  "placeholder",
  "noreply",
  "no-reply",
  "mailinator.com",
  "guerrillamail.com",
  "sharklasers.com",
  "tempmail",
  "localhost",
  "yoursite.com",
  "company.com",
  "acme.com",
];

export type GuardResult = { ok: true } | { ok: false; reason: string };

/**
 * Build the corpus of text the visitor actually typed.
 *
 * ONLY messages with role === "user" may contribute. Retrieved RAG context
 * must never appear here: the knowledge base contains Terry's own email in
 * contact.md, and several documents contain example.com addresses. If context
 * leaked into this corpus, the model could echo Terry's address as the
 * visitor's contact, or satisfy the placeholder check with a document's
 * example address, and every chat would fire a bogus notification.
 */
export function buildUserCorpus(
  messages: readonly { role: string; content: string | null | undefined }[],
): string {
  return messages
    .filter((m) => m.role === "user" && typeof m.content === "string")
    .map((m) => m.content as string)
    .join(" ")
    .toLowerCase();
}

/**
 * Exact-token membership, not substring.
 *
 * A substring test passes when the address appears anywhere — including inside
 * a URL the visitor pasted, or as a fragment of a longer string. Splitting the
 * corpus on separators and comparing whole normalised tokens closes that hole.
 */
function corpusTokens(corpus: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of corpus.split(/[\s,;<>]+/)) {
    const token = raw.replace(/^[('"[]+/, "").replace(/[.,;:!?)\]}'"]+$/, "");
    if (token.includes("@")) tokens.add(token);
  }
  return tokens;
}

/**
 * Strip the punctuation a visitor's sentence leaves around an address.
 *
 * "my email is jane@co.uk," is typed constantly. The corpus tokens are
 * normalised with the same rules, so comparing two normalised forms is
 * symmetric — normalising only the corpus would reject an address the visitor
 * genuinely gave.
 */
function normaliseAddress(raw: string): string {
  return raw
    .trim()
    .replace(/^[('"<]+/, "")
    .replace(/[)>'",.;:!?]+$/, "")
    .toLowerCase();
}

/**
 * Validate an email the model wants to record.
 *
 * Three independent checks, in increasing cost:
 *   1. shape      — is it an address at all
 *   2. intent     — does it look like a placeholder
 *   3. provenance — did the visitor actually type it
 */
export function validateContactEmail(email: unknown, userCorpus: string): GuardResult {
  if (typeof email !== "string") return { ok: false, reason: "email was not a string" };

  const normalised = normaliseAddress(email);
  if (!EMAIL_RE.test(normalised)) return { ok: false, reason: "not a valid email format" };

  if (PLACEHOLDER_PARTS.some((part) => normalised.includes(part))) {
    return { ok: false, reason: "looks like a placeholder or example address" };
  }
  if (!corpusTokens(userCorpus).has(normalised)) {
    return { ok: false, reason: "email was not provided by the visitor in this conversation" };
  }

  return { ok: true };
}

/**
 * Wording returned to the model as a tool error, not to the visitor.
 *
 * The model reads this and re-asks. The visitor never learns the guard exists.
 */
export function rejectionMessage(email: string, reason: string): string {
  return (
    `The email "${email}" was rejected (${reason}). ` +
    "Do not invent an address or guess one. Ask the visitor to type their real " +
    "email address, then call this tool again with exactly what they typed."
  );
}
