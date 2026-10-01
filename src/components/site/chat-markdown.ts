// Turns model output into a small tree the widget can render safely.
//
//   parseChatMarkdown(text, { streaming })
//
// The problem: visitors were seeing `**terry.perangat@gmail.com**` and
// `[LinkedIn](https://…)` as literal text, because answers are rendered as
// plain strings and the model writes Markdown. The fix has to survive streaming,
// which is what makes it less obvious than a regular expression.
//
// Answer text arrives in deltas, and a marker can be split across them. The
// worst moment is `**bo` — one token of `**bold**` arrived and its closing
// `**` has not. Anything that waits for a complete marker before deciding what
// to draw will either flash the raw characters or blank the line until the
// answer finishes.
//
// So this is a single pure function of the text accumulated so far, and it
// never guesses. A construct that is complete is parsed; one that is not
// complete is emitted as plain text with its marker removed. That is true at
// every prefix of a streamed answer, so the same renderer is used for the
// partial answer and the finished one, and a partial answer is never wrong —
// it is just less formatted.
//
// Deliberately not a Markdown implementation. Only what a persona chatbot
// actually emits is handled, and anything unrecognised is left as literal text.
// No HTML is produced or interpreted, and no `dangerouslySetInnerHTML` is
// involved anywhere: this returns data, and the caller maps it to elements.

/** Schemes a link may use. Everything else renders as plain text. */
export const SAFE_SCHEMES = ["https:", "mailto:", "tel:"] as const;

/**
 * Terry's own contact URLs, and nothing else.
 *
 * The model writes contact details the way a person says them, which means it
 * writes `linkedin.com/in/terry-mathew` — no scheme, and sometimes no `www`. A
 * schemeless host has no scheme to validate, so the safe-URL rule refuses it and
 * the visitor is left with text they cannot click, on the one answer whose job
 * is to produce a lead.
 *
 * This is the escape from that, and it is an exact list rather than a pattern.
 * Guessing `https://` for any host that looks like a domain would turn a
 * mention of some other site into a link the model never wrote, and a suffix
 * match on `linkedin.com` would happily link `evil-linkedin.com`. Neither is
 * worth the convenience. Both the `www.` and bare spellings are listed because
 * the model uses both.
 *
 * These are Terry's real addresses, taken from `src/content/knowledge/contact.md`.
 * Adding one is a content decision, not a rendering one.
 */
export const KNOWN_URLS = [
  "linkedin.com/in/terry-mathew",
  "www.linkedin.com/in/terry-mathew",
  "terrymathew.com",
  "www.terrymathew.com",
  "www.instagram.com/tedssy",
  "www.youtube.com/@terrymathew-p",
] as const;

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * One capturing group for the whole alternation, so adding an allowlisted URL
 * cannot shift the group numbers the parser destructures.
 *
 * The lookbehind stops a longer host from matching its own tail — `notlinkedin.com`
 * must not link — and a preceding colon, so `javascript:linkedin.com/…` is not
 * half-matched. The lookahead stops the match from ending mid-path.
 *
 * The optional trailing slash and period are the difference between matching and
 * not matching at all: a contact URL is nearly always at the end of a sentence,
 * and a lookahead that treats `.` as a URL character means the one time the
 * visitor most needs the link is the one time it is refused. Both are stripped
 * again from the label and the href.
 */
const KNOWN_URL_PATTERN = `(?<![A-Za-z0-9@._:-])(?:https?:\\/\\/)?(?:${KNOWN_URLS.map(
  (u) => `${escapeRe(u)}\\/?`,
).join("|")})\\/?\\.?(?![A-Za-z0-9@._~:/?#-])`;

/**
 * Reduce a matched allowlisted URL to its canonical form: no scheme, no trailing
 * slash, no trailing sentence period.
 *
 * The trailing period matters as much as the scheme. The match has to swallow
 * it so the lookahead can succeed, and a link ending in `…mathew.` would be a
 * broken URL that still looks right to the reader.
 */
export function canonicalKnownUrl(matched: string): string {
  return matched.replace(/^https?:\/\//i, "").replace(/[./]+$/, "");
}

/** The link target for an allowlisted URL, always https and never re-derived. */
export function knownUrlHref(matched: string): string {
  return `https://${canonicalKnownUrl(matched)}`;
}

export type ChatNode =
  | { kind: "text"; value: string }
  /** Bold wraps parsed children, so `**a@b.com**` is still a mailto link. */
  | { kind: "bold"; children: ChatNode[] }
  | { kind: "code"; value: string }
  /** A Markdown link. `href` is present only when the URL passed validation. */
  | { kind: "link"; label: string; href: string | null }
  /** A bare address, already turned into a mailto: target. */
  | { kind: "email"; label: string; href: string };

/**
 * Decide whether a URL may become a clickable link.
 *
 * Two rejections matter. A scheme that executes — `javascript:`, `vbscript:` —
 * turns a chatbot answer into a way to run code in the visitor's session. A
 * `data:` URL turns it into a way to render arbitrary attacker-chosen content.
 * Both are refused by allowlist rather than denylist, because a denylist has to
 * be kept up to date and this one does not.
 *
 * Relative URLs are allowed because the model legitimately references the site's
 * own pages, and `#fragment` and `/path` cannot change origin.
 */
export function isSafeUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url) return false;
  // Protocol-relative URLs inherit the page scheme. Refused rather than
  // resolved: a "//evil.example" is a link, but it is not one we wrote.
  if (url.startsWith("//")) return false;

  // A relative or fragment URL has no scheme to check.
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?")) return true;

  // A bare "example.com" is not a URL. Refusing it is deliberate: guessing a
  // scheme for it would be inventing a link the model did not write.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;

  const scheme = url.slice(0, url.indexOf(":") + 1).toLowerCase();
  return (SAFE_SCHEMES as readonly string[]).includes(scheme);
}

/**
 * Alternative pairs are ordered complete-first, so `**bold**` matches the
 * closing-delimiter branch and a truncated `**bo` falls through to the branch
 * that accepts the end of the string. Getting this order backwards produces
 * `b` followed by literal `old**`.
 */
const PATTERN_SOURCE = [
  // Fenced code: closed, or running to the end of what has arrived.
  "```([\\s\\S]*?)```",
  "```([\\s\\S]*)$",
  // Inline code.
  "`([^`\\n]+)`",
  "`([^`\\n]*)$",
  // Bold.
  "\\*\\*([^*]+?)\\*\\*",
  "\\*\\*([^*]*)$",
  "__([^_]+?)__",
  "__([^_]*)$",
  // Markdown link: closed, then the fallbacks for a partial one. Each of
  // these contributes at most the groups the branch below reads — an earlier
  // version of the second one also captured the partial URL, which shifted
  // every group name after it by one.
  // The target allows one level of balanced parentheses, so a URL that
  // genuinely contains them is not truncated. Without this, the pattern
  // stopped at the first `)` and left the rest of the answer as stray text.
  "\\[([^\\]\\n]*)\\]\\(((?:[^()\\s]|\\([^()\\s]*\\))*)\\)",
  "\\[([^\\]\\n]*)\\]\\([^)\\s]*$",
  "\\[([^\\]\\n]*)\\]",
  "\\[([^\\]\\n]*)$",
  // A contact URL the model wrote without a scheme, from the exact allowlist.
  `(${KNOWN_URL_PATTERN})`,
  // Bare address.
  "([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})",
].join("|");

/**
 * Longest run of emphasis or code markers ending the text, e.g. `*`, `**` or
 * `` ` ``.
 *
 * Backticks are included because a streamed code fence arrives as its first two
 * tokens — at `` `` `` the visitor would otherwise see one literal backtick.
 */
const TRAILING_MARKER = /[*_`]+$/;

export type ParseOptions = {
  /**
   * True while tokens are still arriving.
   *
   * Drops a marker left dangling at the very end. After the first token of
   * `**bold**` the text is `*`, and a visitor watching that appear as a literal
   * asterisk sees a glitch that is not really there. Only the streaming path
   * drops it: in a finished answer a trailing asterisk is the author's.
   */
  streaming?: boolean;
};

export function parseChatMarkdown(input: string, options: ParseOptions = {}): ChatNode[] {
  if (!input) return [];

  // A marker may be half-arrived at the end. Cutting it here means the scanner
  // never sees an unbalanced delimiter that it has to special-case.
  const text =
    options.streaming && TRAILING_MARKER.test(input) ? input.replace(TRAILING_MARKER, "") : input;

  const nodes: ChatNode[] = [];
  let plain = "";
  let lastIndex = 0;

  const flush = () => {
    if (plain) {
      nodes.push({ kind: "text", value: plain });
      plain = "";
    }
  };

  // A fresh RegExp per call, deliberately.
  //
  // A module-level global regex carries `lastIndex` across calls, and this
  // function recurses for bold content. The inner call reset `lastIndex` to
  // zero, the outer loop resumed from the inner call's offset, and `exec` began
  // matching the same text again — a hang that exhausted memory rather than
  // failing. One allocation per parse is not worth a shared mutable cursor.
  const pattern = new RegExp(PATTERN_SOURCE, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    plain += text.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    // Unwrap the alternation: the first defined group is the branch that fired.
    const [
      ,
      fence,
      fenceOpen,
      code,
      codeOpen,
      star,
      starOpen,
      under,
      underOpen,
      label,
      target,
      partialLink,
      partialBracket,
      openBracket,
      knownUrl,
      mail,
    ] = match;

    // Text collected so far belongs *before* this node. Flushing inside the
    // branches instead put every plain run at the end of the answer.
    flush();

    if (fence !== undefined || fenceOpen !== undefined) {
      // Contents are rendered verbatim, with no further parsing, so a code
      // sample containing a link or a wildcard is not turned into one.
      nodes.push({ kind: "code", value: (fence ?? fenceOpen ?? "").trim() });
    } else if (code !== undefined || codeOpen !== undefined) {
      nodes.push({ kind: "code", value: (code ?? codeOpen ?? "").trim() });
    } else if (star !== undefined || starOpen !== undefined) {
      // Parsed rather than kept as one string: the shape that actually shipped
      // was `**terry.perangat@gmail.com**`, and treating the contents as opaque
      // would leave the visitor unable to click it.
      nodes.push({ kind: "bold", children: parseChatMarkdown((star ?? starOpen ?? "").trim()) });
    } else if (under !== undefined || underOpen !== undefined) {
      nodes.push({ kind: "bold", children: parseChatMarkdown((under ?? underOpen ?? "").trim()) });
    } else if (label !== undefined) {
      // A complete link. An unsafe target keeps the label as text rather than
      // dropping it, so the reader still sees what the model said.
      const href = target ?? "";
      nodes.push({ kind: "link", label, href: isSafeUrl(href) ? href.trim() : null });
    } else if (partialLink !== undefined) {
      // `[label](partial-url` — the target is still arriving, so no link yet.
      // The half-written URL is dropped rather than shown: there is no honest
      // way to display it without putting raw `](` in front of the reader.
      nodes.push({ kind: "text", value: partialLink });
    } else if (partialBracket !== undefined) {
      // `[label]` with no target at all.
      nodes.push({ kind: "text", value: partialBracket });
    } else if (openBracket !== undefined) {
      // An opening bracket and nothing else yet.
      nodes.push({ kind: "text", value: openBracket });
    } else if (knownUrl !== undefined) {
      // Scheme stripped from the label so a link reads the same whether or not
      // the model wrote it out in full. The href is built from the allowlist
      // entry, never from anything the text could have appended.
      const bare = canonicalKnownUrl(knownUrl);
      nodes.push({ kind: "link", label: bare, href: `https://${bare}` });
      // The match has to swallow a trailing slash or period to satisfy the
      // lookahead, and it is not part of the URL. Put it back as text —
      // otherwise the sentence it ends loses its full stop.
      const trailing = knownUrl.replace(/^https?:\/\//i, "").slice(bare.length);
      if (trailing) nodes.push({ kind: "text", value: trailing });
    } else if (mail !== undefined) {
      nodes.push({ kind: "email", label: mail, href: `mailto:${mail}` });
    }
  }

  plain += text.slice(lastIndex);
  flush();
  return nodes;
}

/** Flattened plain text, for tests and for anywhere the markup must be gone. */
export function toPlainText(nodes: ChatNode[]): string {
  return nodes
    .map((n) => {
      if (n.kind === "bold") return toPlainText(n.children);
      return "value" in n ? n.value : n.label;
    })
    .join("");
}
