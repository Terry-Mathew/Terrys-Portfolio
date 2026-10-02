// Deterministic validation for visitor-supplied contact details.
//
// This is the last line of defence, and it must not depend on the model
// cooperating. A prompt instruction is a request; a regex is a fact.
//
// The failure this exists to prevent: the model invents plausible contact
// details for a visitor who never gave them, and a phone notification goes out
// for a person who does not exist. That happened on the previous
// implementation.
//
// Both fields are checked the same three ways — shape, intent, provenance — and
// provenance is the one that matters. A wrong number is worse than a missing
// one: the cost of the error is a phone call to a stranger.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/** E.164 allows 15 digits; 7 is the shortest number anyone can dial. */
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

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

// --- phone -------------------------------------------------------------------
//
// Same discipline as the address, and for the same reason: the model must not be
// able to invent a number. A guessed email wastes one reply. A guessed phone
// number calls a stranger.

// Characters a phone number is allowed to contain. Anything else in the run
// means it is not a number, which is what keeps prose out of the set.
const PHONE_TOKEN_RE = /^[+()\-.\s\d]+$/;

/**
 * A phone number as it appears in running text: a digit, then formatting, then
 * a digit.
 *
 * It has to span internal spaces, because that is how people write numbers. An
 * earlier version tokenised the corpus on whitespace first, which split
 * "+91 70224 46269" into three pieces too short to recognise — so the most
 * common way of typing a number was the one way that could never be captured.
 * Letters are excluded, so "45 and call 7022446269" does not run together.
 */
const PHONE_RUN_RE = /\+?\d[\d\s().-]{5,}\d/g;

/** Five or more of the same digit in a row is a placeholder, not a number. */
const REPEATED_DIGITS_RE = /(\d)\1{4,}/;

const KEYPAD_ASCENDING_STEP = 1;
const KEYPAD_DESCENDING_STEP = 9;

const digitsOf = (value: string): string => value.replace(/\D/g, "");

function isPlaceholderNumber(digits: string): boolean {
  if (REPEATED_DIGITS_RE.test(digits)) return true;
  // A run straight up or straight down the keypad, wrapping 9 → 0.
  if (digits.length < MIN_PHONE_DIGITS) return false;
  const d = digits.split("").map(Number);
  const step = (from: number, by: number) =>
    d.every((v, i) => i === 0 || v === (d[i - 1]! + by) % 10);
  return step(d[0]!, KEYPAD_ASCENDING_STEP) || step(d[0]!, KEYPAD_DESCENDING_STEP);
}

/**
 * Every phone-shaped run the visitor actually typed, reduced to digits.
 *
 * Reduced rather than compared as written, because the same number arrives in
 * many forms: "+91 70224 46269", "+91-70224-46269", "917022446269". Comparing
 * the raw strings would reject a number the visitor genuinely gave, which trains
 * the model to re-ask and loses the lead.
 *
 * Matched as a whole run rather than a whitespace-delimited token, so a number
 * written across spaces is captured. A run that ends up with more digits than
 * E.164 allows is dropped, which is what keeps a long order number from
 * supplying a usable substring.
 */
export function corpusPhoneNumbers(userCorpus: string): Set<string> {
  const found = new Set<string>();
  for (const run of userCorpus.match(PHONE_RUN_RE) ?? []) {
    const token = run.trim();
    if (!PHONE_TOKEN_RE.test(token)) continue;
    const digits = digitsOf(token);
    if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) continue;
    found.add(digits);
  }
  return found;
}

/**
 * Validate a phone number the model wants to record.
 *
 * Same three checks as the address: shape, intent, provenance. Optional — a
 * caller with no number to record passes an empty string and gets `ok`, because
 * most visitors give an email and nothing else, and rejecting those would throw
 * away the leads that already work.
 */
export function validateContactPhone(phone: unknown, userCorpus: string): GuardResult {
  // Optional. Absent is not a failure.
  if (phone === undefined || phone === null) return { ok: true };
  if (typeof phone !== "string") return { ok: false, reason: "phone was not a string" };

  const trimmed = phone.trim();
  if (!trimmed) return { ok: true };

  if (!PHONE_TOKEN_RE.test(trimmed)) {
    return { ok: false, reason: "phone contains characters a phone number does not use" };
  }

  const digits = digitsOf(trimmed);
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return {
      ok: false,
      reason: `phone must have ${MIN_PHONE_DIGITS} to ${MAX_PHONE_DIGITS} digits`,
    };
  }
  if (isPlaceholderNumber(digits)) {
    return { ok: false, reason: "phone looks like a placeholder number" };
  }
  if (!corpusPhoneNumbers(userCorpus).has(digits)) {
    return { ok: false, reason: "phone was not provided by the visitor in this conversation" };
  }

  return { ok: true };
}

/** Wording for the model when a number is refused. The visitor never sees it. */
export function phoneRejectionMessage(phone: string, reason: string): string {
  return (
    `The phone number "${phone}" was rejected (${reason}). ` +
    "Do not invent, complete or guess a number. Ask the visitor to type the " +
    "number themselves, then call this tool again with exactly what they typed. " +
    "If they do not want to give a number, record the contact without one."
  );
}

/** Digits only, for de-duplicating a contact across formatting differences. */
export function normalisePhone(phone: string): string {
  return digitsOf(phone.trim());
}
