// Visitor-facing answer formatting.
//
//   npm run test:chat-format
//
// The model writes Markdown and the widget rendered plain strings, so visitors
// saw `**terry.perangat@gmail.com**` and `[LinkedIn](https://…)` literally — on
// the contact answer, which is the path a lead takes.
//
// The hard part is streaming. A marker can be split across deltas, so at some
// instant the accumulated text is `**bo` or `[LinkedIn](https://ex`. A renderer
// that waits for a complete marker flashes raw characters; one that assumes a
// complete marker is wrong for every partial answer.
//
// The property these tests pin: at EVERY prefix of a streamed answer, no raw
// `**`, backtick, fence or `[label](url)` is ever produced. The parser is
// imported from the real module — compiled on the fly with the already-declared
// typescript package — so a re-implementation in this file would prove nothing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src", "components", "site", "chat-markdown.ts"), "utf8");
const { outputText } = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const mod = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const { parseChatMarkdown, toPlainText, isSafeUrl, knownUrlHref, KNOWN_URLS, SAFE_SCHEMES } = mod;

const render = (text, streaming = false) => parseChatMarkdown(text, { streaming });
/** What the visitor actually sees, with all markup removed. */
const flat = (text, streaming = false) => toPlainText(render(text, streaming));
const links = (text) => render(text).filter((n) => n.kind === "link" || n.kind === "email");
const RAW = /\*\*|__|`|```|\]\(/;

/** Every prefix of a string, as tokens arriving would produce. */
const prefixes = (s) => Array.from({ length: s.length }, (_, i) => s.slice(0, i + 1));

// --------------------------------------------------- 1. bold markers

test("1. bold markers are consumed, not shown", () => {
  const nodes = render("Reach me at **terry.perangat@gmail.com** today.");
  assert.equal(flat("Reach me at **terry.perangat@gmail.com** today.").includes("**"), false);
  const bold = nodes.find((n) => n.kind === "bold");
  assert.ok(bold, "expected a bold node");
  assert.equal(toPlainText(bold.children), "terry.perangat@gmail.com");
  assert.equal(toPlainText(nodes), "Reach me at terry.perangat@gmail.com today.");
});

test("1b. both emphasis markers are handled", () => {
  assert.equal(flat("__strong__ word"), "strong word");
  assert.equal(flat("a **b** c __d__ e"), "a b c d e");
});

test("1c. an unterminated bold marker is stripped, never shown", () => {
  // The streaming case. The opening marker must not reach the visitor even
  // though the closing one has not arrived.
  assert.equal(flat("**bo", true), "bo");
  assert.equal(flat("__bo", true), "bo");
});

// ---------------------------------------------------- 2. markdown links

test("2. a safe markdown link becomes a real link", () => {
  const [link] = links("[LinkedIn](https://www.linkedin.com/in/terry-mathew)");
  assert.equal(link.kind, "link");
  assert.equal(link.label, "LinkedIn");
  assert.equal(link.href, "https://www.linkedin.com/in/terry-mathew");
});

test("2b. the label is what is shown, not the syntax", () => {
  const answer =
    "You can reach me at **terry.perangat@gmail.com**, or find me on [LinkedIn](https://www.linkedin.com/in/terry-mathew).";
  const shown = flat(answer);
  assert.equal(shown, "You can reach me at terry.perangat@gmail.com, or find me on LinkedIn.");
  assert.equal(RAW.test(shown), false, `raw syntax survived: ${shown}`);
});

test("2c. relative and same-site links are allowed", () => {
  assert.equal(isSafeUrl("/projects/digital-twin"), true);
  assert.equal(isSafeUrl("#experience"), true);
  assert.equal(
    render("[the case study](/projects/digital-twin)")[0].href,
    "/projects/digital-twin",
  );
});

test("2d. an incomplete link degrades to its label", () => {
  // `[label](https://ex` — the target is still arriving. Showing `label` alone
  // is the only option that never shows a raw `](`.
  const nodes = render("[LinkedIn](https://www.linkedin.com/in/te", true);
  assert.equal(RAW.test(toPlainText(nodes)), false);
  assert.equal(toPlainText(nodes), "LinkedIn");
  assert.equal(
    nodes.some((n) => n.kind === "link" && n.href),
    false,
    "no link until it is complete",
  );
});

test("2e. a bare bracket shows no raw bracket", () => {
  assert.equal(RAW.test(flat("[something", true)), false);
  assert.equal(RAW.test(flat("[a] and [b]", true)), false);
});

// ------------------------------------------------ 3. plain email addresses

test("3. a plain email address becomes a mailto link", () => {
  const [mail] = links("Write to terry.perangat@gmail.com if you prefer.");
  assert.equal(mail.kind, "email");
  assert.equal(mail.label, "terry.perangat@gmail.com");
  assert.equal(mail.href, "mailto:terry.perangat@gmail.com");
});

test("3b. an address inside a markdown link is not double-linked", () => {
  const nodes = render("[mail me](mailto:terry.perangat@gmail.com)");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].kind, "link");
  assert.equal(nodes[0].href, "mailto:terry.perangat@gmail.com");
});

test("3c. an address that is bold still resolves to a mailto link", () => {
  // `**terry.perangat@gmail.com**` is the exact shape that shipped. If bold
  // content were kept as an opaque string the markers would disappear but the
  // address would not be clickable, which is the half of the bug that matters.
  const nodes = render("**terry.perangat@gmail.com**");
  assert.equal(toPlainText(nodes), "terry.perangat@gmail.com");
  const bold = nodes.find((n) => n.kind === "bold");
  assert.equal(bold.children[0].kind, "email");
  assert.equal(bold.children[0].href, "mailto:terry.perangat@gmail.com");
});

test("3d. a link inside bold is still a link", () => {
  const nodes = render("**[LinkedIn](https://example.com)**");
  assert.equal(toPlainText(nodes), "LinkedIn");
  const bold = nodes.find((n) => n.kind === "bold");
  assert.equal(bold.children[0].href, "https://example.com");
});

// --------------------------------------------------- 4. unsafe URLs

test("4. javascript: and data: URLs are refused", () => {
  for (const url of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ]) {
    assert.equal(isSafeUrl(url), false, url);
  }
});

test("4b. an unsafe link keeps its label and is not clickable", () => {
  const nodes = render("[Click me](javascript:alert(1))");
  const link = nodes.find((n) => n.kind === "link");
  assert.ok(link, "the label must survive");
  assert.equal(link.label, "Click me");
  assert.equal(link.href, null, "no href may be emitted for an unsafe scheme");
  assert.equal(toPlainText(nodes), "Click me");
});

test("4b2. a refused link with parentheses leaves nothing behind", () => {
  // The target may legitimately contain balanced parens. Truncating at the
  // first `)` left a stray bracket in the answer — a visitor would see
  // "Click me)".
  const nodes = render("[Click me](javascript:alert(1))");
  assert.equal(toPlainText(nodes), "Click me");
  assert.equal(nodes.find((n) => n.kind === "link").href, null);
});

test("4b3. a valid URL containing parentheses survives whole", () => {
  const nodes = render("[wiki](https://x.com/a(b))");
  assert.equal(nodes.find((n) => n.kind === "link").href, "https://x.com/a(b)");
  assert.equal(toPlainText(nodes), "wiki");
});

test("4c. a protocol-relative URL is refused", () => {
  // It inherits the page scheme, so it is a link the model did not write.
  assert.equal(isSafeUrl("//evil.example/x"), false);
  assert.equal(render("[x](//evil.example/x)")[0].href, null);
});

test("4d. a schemeless host is not silently given a scheme", () => {
  assert.equal(isSafeUrl("evil.example/x"), false);
  assert.equal(isSafeUrl("javascript:alert(1)"), false, "parens in a bad scheme stay refused");
  assert.equal(isSafeUrl("www.linkedin.com/in/x"), false);
});

test("4e. exactly the allowed schemes pass", () => {
  for (const url of [
    "https://example.com",
    "HTTPS://EXAMPLE.COM",
    "mailto:a@b.com",
    "tel:+919999999999",
  ]) {
    assert.equal(isSafeUrl(url), true, url);
  }
  assert.deepEqual([...SAFE_SCHEMES], ["https:", "mailto:", "tel:"]);
});

// ------------------------------ 5. markers split across streamed chunks

test("5. no prefix of a streamed answer ever shows raw syntax", () => {
  const answers = [
    "You can reach me at **terry.perangat@gmail.com** or on [LinkedIn](https://www.linkedin.com/in/terry-mathew).",
    "Use `npm run dev` to start it.",
    "```js\nconst x = 1;\n```",
    "A **bold** word with __underscores__ too.",
    "Mail terry.perangat@gmail.com, or see [the case study](/projects/digital-twin).",
  ];
  for (const answer of answers) {
    for (const prefix of prefixes(answer)) {
      const shown = flat(prefix, true);
      assert.equal(RAW.test(shown), false, `prefix "${prefix}" leaked: "${shown}"`);
    }
  }
});

test("5b. every streamed prefix is a non-empty, non-degenerate render", () => {
  // Text must not vanish mid-stream: an answer that is unreadable for a second
  // is a worse failure than one showing a stray character.
  const answer = "Reach me at **terry.perangat@gmail.com** please.";
  for (const prefix of prefixes(answer)) {
    assert.ok(render(prefix, true).length > 0, `empty render for "${prefix}"`);
  }
});

test("5c. the finished render is stable no matter where the chunks split", () => {
  const answer = "**Bold** and [a link](https://example.com) and a@b.com";
  const expected = toPlainText(render(answer));
  for (let i = 1; i < answer.length; i++) {
    // Simulate two chunks, then the complete text.
    const partial = answer.slice(0, i);
    assert.equal(flat(partial + answer.slice(i), false), expected);
  }
});

test("5d. streaming mode drops a dangling marker; the final render keeps it", () => {
  assert.equal(flat("*", true), "", "a lone trailing asterisk is dropped while streaming");
  assert.equal(flat("*", false), "*", "but kept once the answer is complete");
});

test("5e. a marker split at the first character never flashes", () => {
  // `**bold**` tokenised badly can be `*` then `*bold**`. The intermediate
  // state must not put a literal asterisk in front of the visitor.
  const states = ["*", "**b", "**bo", "**bol", "**bold", "**bold*", "**bold**"];
  for (const state of states) {
    assert.equal(RAW.test(flat(state, true)), false, state);
  }
});

// ------------------------------------------- 6. cached contact answers

test("6. a replayed cached contact answer renders the same as a live one", () => {
  // The answer cache is what served the broken version, so the stored text is
  // plain Markdown with no delta structure. It must render identically.
  const cached =
    "You can reach me at **terry.perangat@gmail.com**, or find me on [LinkedIn](https://www.linkedin.com/in/terry-mathew). If you want to talk about a role or a project, I'm happy to hear it.";
  const nodes = render(cached);
  assert.equal(
    toPlainText(nodes),
    "You can reach me at terry.perangat@gmail.com, or find me on LinkedIn. If you want to talk about a role or a project, I'm happy to hear it.",
  );
  // Recursive: the address is inside bold, which is exactly the shape that
  // shipped, so a top-level filter would report it missing.
  const hrefs = [];
  const walk = (list) => {
    for (const n of list) {
      if (n.kind === "bold") walk(n.children);
      else if (n.href) hrefs.push(n.href);
    }
  };
  walk(nodes);
  assert.deepEqual(hrefs, [
    "mailto:terry.perangat@gmail.com",
    "https://www.linkedin.com/in/terry-mathew",
  ]);
});

test("6b. a cached answer with no markup is untouched", () => {
  const plain = "Bengaluru, India.";
  assert.equal(toPlainText(render(plain)), plain);
});

// ------------------------------ 7. normal prose without formatting

test("7. ordinary prose passes through unchanged", () => {
  const answers = [
    "I'm currently Senior Data Product Manager for Partner Analytics at Oracle.",
    "He led a 20-person EMEA revenue-operations team handling more than 20,000 tickets per quarter.",
    "That is around $1.5M in qualified bookings across 86+ partners (not an estimate).",
    "He works with 50-100 people; the exact split varies.",
    "A sentence with a hyphen, an em dash — and an ellipsis… stays intact.",
  ];
  for (const answer of answers) {
    assert.equal(toPlainText(render(answer)), answer, answer);
  }
});

test("7b. prose containing asterisks as multiplication is not mangled", () => {
  // "1.2B" and "20,000" are fine; a lone asterisk between words is kept.
  const answer = "Ratings run 4*5 across the cohort.";
  assert.equal(toPlainText(render(answer)), answer);
});

test("7c. an empty answer produces no nodes", () => {
  assert.deepEqual(render(""), []);
  assert.deepEqual(render("", true), []);
});

// ---------------------------------------- allowlisted contact URLs
//
// The model writes contact details the way a person says them: bare, often
// without a scheme and sometimes without `www`. A schemeless host has no scheme
// to validate, so the safe-URL rule refuses it — which left the LinkedIn
// reference unclickable on the one answer whose job is to produce a lead.
//
// The fix is an exact list, not a pattern. Nothing else becomes a link.

const hrefs = (text) => {
  const out = [];
  const walk = (list) => {
    for (const n of list) {
      if (n.kind === "bold") walk(n.children);
      else if (n.href) out.push(n.href);
    }
  };
  walk(render(text));
  return out;
};

// 1. bare LinkedIn URL
test("a bare LinkedIn URL becomes a link", () => {
  const answer =
    "You can reach me at terry.perangat@gmail.com, or on LinkedIn at linkedin.com/in/terry-mathew. Either works.";
  assert.deepEqual(hrefs(answer), [
    "mailto:terry.perangat@gmail.com",
    "https://linkedin.com/in/terry-mathew",
  ]);
  // The label is the bare host, and the sentence period is not part of it.
  const link = render(answer).find((n) => n.kind === "link");
  assert.equal(link.label, "linkedin.com/in/terry-mathew");
  assert.equal(
    flat(answer),
    "You can reach me at terry.perangat@gmail.com, or on LinkedIn at linkedin.com/in/terry-mathew. Either works.",
  );
});

test("the www spelling of an allowlisted URL also links", () => {
  assert.deepEqual(hrefs("See www.linkedin.com/in/terry-mathew."), [
    "https://www.linkedin.com/in/terry-mathew",
  ]);
});

test("an allowlisted URL written with a scheme still links, and drops the scheme from the label", () => {
  const nodes = render("Find me at https://linkedin.com/in/terry-mathew.");
  assert.equal(nodes.find((n) => n.kind === "link").href, "https://linkedin.com/in/terry-mathew");
  assert.equal(nodes.find((n) => n.kind === "link").label, "linkedin.com/in/terry-mathew");
});

// 2. known portfolio URL
test("the portfolio URL links in both spellings", () => {
  assert.deepEqual(hrefs("It is at www.terrymathew.com."), ["https://www.terrymathew.com"]);
  assert.deepEqual(hrefs("It is at terrymathew.com."), ["https://terrymathew.com"]);
});

test("every allowlisted address links", () => {
  for (const url of KNOWN_URLS) {
    // The allowlist entries are already canonical: `knownUrlHref` must be the
    // identity on them, so a stale trailing slash cannot hide in the list.
    assert.equal(knownUrlHref(url), `https://${url}`, `${url} is not canonical`);
    assert.deepEqual(hrefs(`See ${url} now.`), [`https://${url}`], url);
  }
  assert.ok(KNOWN_URLS.length >= 6, "the allowlist should cover the contact document");
});

test("a trailing slash or period is not left in the href", () => {
  // A href ending in `mathew.` is broken but looks correct to the reader, and
  // these are the exact spellings the model produces at the end of a sentence.
  assert.equal(
    knownUrlHref("linkedin.com/in/terry-mathew."),
    "https://linkedin.com/in/terry-mathew",
  );
  assert.equal(
    knownUrlHref("https://www.instagram.com/tedssy/"),
    "https://www.instagram.com/tedssy",
  );
  assert.equal(knownUrlHref("www.terrymathew.com"), "https://www.terrymathew.com");
});

// 3. unknown domains remain text
test("an unknown domain is not linked", () => {
  for (const answer of [
    "Try example.com or www.elsewhere.org today.",
    "He wrote about dbt.io and cloudflare.com.",
    "Visit medium.com/@someone for more.",
  ]) {
    assert.deepEqual(hrefs(answer), [], answer);
    assert.equal(flat(answer), answer, "the text must be untouched");
  }
});

test("a domain that merely contains an allowlisted name is not linked", () => {
  // A suffix match on `linkedin.com` would happily link any host that ended
  // with it, which is the whole reason this is an exact list.
  for (const answer of [
    "https://notlinkedin.com/in/terry-mathew",
    "https://evil-linkedin.com/in/terry-mathew",
    "https://linkedin.com.attacker.example/in/terry-mathew",
    "https://terrymathew.com.evil.example/",
  ]) {
    assert.deepEqual(hrefs(answer), [], answer);
  }
});

test("a truncated allowlisted path is not a match", () => {
  // The lookahead stops a match ending mid-path, so a partial arrival while
  // streaming never becomes a link pointing somewhere truncated.
  assert.deepEqual(hrefs("linkedin.com/in/terry-mathe is not it."), []);
  assert.deepEqual(hrefs("linkedin.com/in/terry-mathew.x is not it."), []);
});

// 4. unsafe schemes remain unlinked
test("the allowlist does not reopen unsafe schemes", () => {
  for (const answer of [
    "[Click me](javascript:alert(1))",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example/x",
    "[x](//evil.example/x)",
  ]) {
    assert.deepEqual(hrefs(answer), [], answer);
  }
  assert.equal(RAW.test(flat("[Click me](javascript:alert(1))")), false);
});

test("an allowlisted host preceded by an unsafe scheme is not linked", () => {
  // `javascript:linkedin.com/...` is not a link to LinkedIn.
  assert.deepEqual(hrefs("javascript:linkedin.com/in/terry-mathew"), []);
});

// 5. existing Markdown links keep working
test("Markdown links still work alongside the allowlist", () => {
  assert.deepEqual(hrefs("[LinkedIn](https://www.linkedin.com/in/terry-mathew)"), [
    "https://www.linkedin.com/in/terry-mathew",
  ]);
  // A Markdown link to something not on the allowlist is unaffected: the
  // allowlist governs bare URLs only, and the safe-scheme rule governs the rest.
  assert.deepEqual(hrefs("[docs](https://developers.cloudflare.com/workers)"), [
    "https://developers.cloudflare.com/workers",
  ]);
  assert.deepEqual(hrefs("[case study](/projects/digital-twin)"), ["/projects/digital-twin"]);
});

test("an allowlisted URL inside bold is still a link", () => {
  const nodes = render("**linkedin.com/in/terry-mathew**");
  const bold = nodes.find((n) => n.kind === "bold");
  assert.equal(bold.children[0].href, "https://linkedin.com/in/terry-mathew");
});

test("no prefix of a streamed allowlisted URL leaks raw syntax", () => {
  const answer = "Find me at linkedin.com/in/terry-mathew or terry.perangat@gmail.com.";
  for (const prefix of prefixes(answer)) {
    const shown = flat(prefix, true);
    assert.equal(RAW.test(shown), false, `prefix "${prefix}" leaked: "${shown}"`);
  }
});

// ------------------------------------------------- source-level guards

/**
 * Comments are stripped before these guards run.
 *
 * Both files explain in prose that they do not use `dangerouslySetInnerHTML`,
 * which means the phrase is *in* them. A guard that matches its own
 * documentation reports a false failure, and a guard that cries wolf gets
 * deleted. Stripping first is what makes the guard trustworthy.
 */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

test("the parser returns data and never HTML", () => {
  // The safety property is structural: the module cannot inject markup because
  // it has no rendering surface at all. Assert that on the real source.
  const real = stripComments(
    readFileSync(join(ROOT, "src", "components", "site", "chat-markdown.ts"), "utf8"),
  );
  assert.equal(/dangerouslySetInnerHTML/.test(real), false);
  assert.equal(/<\/?[a-z]+[\s>/]/i.test(real), false, "the parser must not contain HTML");
  assert.equal(/from ["']react["']/.test(real), false, "the parser must stay render-free");
});

test("the widget does not use dangerouslySetInnerHTML", () => {
  const widget = stripComments(
    readFileSync(join(ROOT, "src", "components", "site", "ChatWidget.tsx"), "utf8"),
  );
  assert.equal(
    /dangerouslySetInnerHTML/.test(widget),
    false,
    "answers are rendered as elements, not injected HTML",
  );
});

test("the system prompt forbids emphasis and link syntax", () => {
  const chat = readFileSync(join(ROOT, "src", "server", "chat.ts"), "utf8");
  assert.match(chat, /Do not use Markdown emphasis/i);
  assert.match(chat, /Do not use Markdown link syntax/i);
});

test("promptVersion was bumped for the new answer-format contract", () => {
  // The answer cache is keyed on it, so an unchanged value would keep serving
  // answers written under the old instructions.
  const config = readFileSync(join(ROOT, "src", "server", "chat.config.ts"), "utf8");
  const m = /promptVersion:\s*(\d+)/.exec(config);
  assert.ok(m, "promptVersion must be set");
  assert.ok(Number(m[1]) >= 3, `promptVersion is ${m[1]}; the format contract changed at 3`);
});
