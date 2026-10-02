// Frontmatter parsing, tested against the real module.
//
//   npm run test:frontmatter
//
// The parser is TypeScript and the rest of this project's tests run under
// `node --test`, which cannot import TypeScript directly. Rather than mirror the
// logic in the test — which would keep passing happily while the module it is
// supposed to be testing broke — this compiles the actual source with the
// `typescript` package that is already a devDependency, and imports the result.
// So these tests fail when the parser fails, and no new dependency is added.
//
// Run: node --test scripts/frontmatter-test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "src", "server", "frontmatter.ts");

/** Compile the real module and import it, so there is one implementation. */
async function loadParser() {
  const source = readFileSync(SOURCE, "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  assert.deepEqual(
    (diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")),
    [],
    "frontmatter.ts does not transpile cleanly",
  );
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  return import(url);
}

const { parseFrontmatter } = await loadParser();

/** The block as supplied in the canonical bundle, verbatim. */
const SUPPLIED = `---
title: Terry Mathew — Canonical Facts
type: canonical_facts
priority: 100
updated: 2026-10
aliases:
  - Terry Mathew
  - Terry
  - professional background
  - current role
  - career
  - education
  - where is Terry based
---

# Terry Mathew — Canonical Facts

Terry Mathew is a data product, analytics, and applied AI professional based in
Bengaluru, India.
`;

/** The same document with no frontmatter at all. */
const PLAIN = `# Terry Mathew — Canonical Facts

Terry Mathew is a data product, analytics, and applied AI professional based in
Bengaluru, India.
`;

// ---------------------------------------------------------------- the schema

test("parses every field of the supplied schema", () => {
  const { frontmatter } = parseFrontmatter(SUPPLIED);
  assert.deepEqual(frontmatter, {
    title: "Terry Mathew — Canonical Facts",
    type: "canonical_facts",
    priority: 100,
    updated: "2026-10",
    aliases: [
      "Terry Mathew",
      "Terry",
      "professional background",
      "current role",
      "career",
      "education",
      "where is Terry based",
    ],
  });
});

test("priority is a number and updated stays a string", () => {
  // `updated: 2026-10` is a date to a human and nothing at all to Number(). The
  // coercion is deliberately restricted to plain integers, because turning this
  // into NaN or a Date would be worse than leaving it as written.
  const { frontmatter } = parseFrontmatter(SUPPLIED);
  assert.equal(typeof frontmatter.priority, "number");
  assert.equal(frontmatter.priority, 100);
  assert.equal(typeof frontmatter.updated, "string");
  assert.equal(frontmatter.updated, "2026-10");
});

test("a non-integer priority is ignored rather than coerced to NaN", () => {
  const { frontmatter } = parseFrontmatter("---\npriority: high\n---\n\n# T\n");
  assert.equal(frontmatter.priority, undefined);
});

test("quoted values are unquoted", () => {
  const { frontmatter } = parseFrontmatter('---\ntitle: "A: colon inside"\n---\n\n# T\n');
  assert.equal(frontmatter.title, "A: colon inside");
});

test("an alias containing a colon is not mistaken for a key", () => {
  const { frontmatter } = parseFrontmatter("---\naliases:\n  - what: really\n---\n\n# T\n");
  assert.deepEqual(frontmatter.aliases, ["what: really"]);
});

// ------------------------------------------------- the property that matters
// most: metadata must not change the text that gets indexed

test("adding frontmatter leaves the embedded body byte-identical", () => {
  // This is the whole reason frontmatter is parsed rather than left inline. If
  // the body of the frontmatter version differs from the plain version by even
  // a newline, then adding a title re-embeds the document, and the content hash
  // stops meaning "the prose changed".
  assert.equal(parseFrontmatter(SUPPLIED).body, PLAIN);
});

test("the hash inputs are unaffected by frontmatter edits", () => {
  const plainHash = hashOf(parseFrontmatter(PLAIN).body);
  const withMeta = hashOf(parseFrontmatter(SUPPLIED).body);
  const retitled = hashOf(
    parseFrontmatter(SUPPLIED.replace("Terry Mathew — Canonical Facts", "Renamed")).body,
  );
  assert.equal(withMeta, plainHash);
  assert.equal(retitled, plainHash, "a title change must not force a re-embed");
});

test("no frontmatter text survives into the body", () => {
  const { body } = parseFrontmatter(SUPPLIED);
  for (const leaked of [
    "title:",
    "type:",
    "priority:",
    "updated:",
    "aliases:",
    "canonical_facts",
  ]) {
    assert.equal(body.includes(leaked), false, `"${leaked}" leaked into the body`);
  }
  assert.equal(body.includes("---"), false);
});

test("the raw file is never modified", () => {
  const { raw, body, block } = parseFrontmatter(SUPPLIED);
  assert.equal(raw, SUPPLIED);
  assert.ok(block.startsWith("---") && block.includes("canonical_facts"));
  assert.notEqual(body, raw);
});

/** Stands in for the ingest fingerprint, which is category plus body. */
function hashOf(body) {
  return `${"about"}\u0000${body}`;
}

// --------------------------------------------------------------- robustness

test("a file with no frontmatter comes back completely untouched", () => {
  const parsed = parseFrontmatter(PLAIN);
  assert.equal(parsed.body, PLAIN);
  assert.equal(parsed.raw, PLAIN);
  assert.deepEqual(parsed.frontmatter, {});
  assert.equal(parsed.block, "");
});

test("an unterminated fence is not frontmatter, and nothing is lost", () => {
  // The dangerous failure is treating the rest of the file as metadata and
  // indexing an empty document. Failing open the other way — ignoring the block
  // — costs the metadata and keeps the content.
  const raw = "---\ntitle: x\n\n# Heading\n\nBody text.\n";
  const parsed = parseFrontmatter(raw);
  assert.equal(parsed.body, raw);
  assert.deepEqual(parsed.frontmatter, {});
});

test("frontmatter must open the file, not appear partway down", () => {
  const raw = "Some intro.\n\n---\ntitle: x\n---\n\n# Heading\n";
  const parsed = parseFrontmatter(raw);
  assert.equal(parsed.body, raw);
  assert.equal(parsed.frontmatter.title, undefined);
});

test("a horizontal rule inside the body is not mistaken for the closing fence", () => {
  const raw = "---\ntitle: x\n---\n\n# Heading\n\n---\n\nMore text.\n";
  const parsed = parseFrontmatter(raw);
  assert.equal(parsed.frontmatter.title, "x");
  assert.equal(parsed.body, "# Heading\n\n---\n\nMore text.\n");
});

test("a body that begins with a horizontal rule survives", () => {
  // The body is taken from after the FIRST closing fence, so a document whose
  // first line is `---` is not truncated to nothing.
  const raw = "---\ntitle: x\n---\n---\nbody below\n";
  assert.equal(parseFrontmatter(raw).body, "---\nbody below\n");
});

test("CRLF line endings are preserved", () => {
  const raw = "---\r\ntitle: x\r\n---\r\n# Heading\r\nBody\r\n";
  const parsed = parseFrontmatter(raw);
  assert.equal(parsed.frontmatter.title, "x");
  assert.equal(parsed.body, "# Heading\r\nBody\r\n");
});

test("a byte-order mark is tolerated", () => {
  const parsed = parseFrontmatter("\uFEFF---\ntitle: x\n---\n\n# Heading\n");
  assert.equal(parsed.frontmatter.title, "x");
  assert.equal(parsed.body, "# Heading\n");
});

test("comments and blank lines are ignored", () => {
  const { frontmatter } = parseFrontmatter(
    "---\n# a comment\ntitle: x\n\n  \n# another\ntype: bio\n---\n\n# H\n",
  );
  assert.equal(frontmatter.title, "x");
  assert.equal(frontmatter.type, "bio");
});

test("unknown keys are ignored rather than rejected", () => {
  const { frontmatter, body } = parseFrontmatter("---\nunknown: v\ntitle: x\n---\n\n# H\n");
  assert.equal(frontmatter.title, "x");
  assert.equal(body, "# H\n");
});

test("an empty frontmatter block yields an empty result and keeps the body", () => {
  const parsed = parseFrontmatter("---\n---\n\n# Heading\n");
  assert.deepEqual(parsed.frontmatter, {});
  // Leading blank lines go with the fence; the heading is the first content.
  assert.equal(parsed.body, "# Heading\n");
});

test("an empty file does not throw", () => {
  const parsed = parseFrontmatter("");
  assert.equal(parsed.body, "");
  assert.deepEqual(parsed.frontmatter, {});
});

test("a frontmatter value containing a hash is not treated as a comment", () => {
  // Only whole-line comments are stripped. A trailing `#` is a legitimate
  // character in a title, and stripping from it would silently rename things.
  const { frontmatter } = parseFrontmatter("---\ntitle: C# developer\n---\n\n# H\n");
  assert.equal(frontmatter.title, "C# developer");
});

test("an alias list ends at the first non-item line", () => {
  const { frontmatter } = parseFrontmatter("---\naliases:\n  - a\n  - b\ntitle: x\n---\n\n# H\n");
  assert.deepEqual(frontmatter.aliases, ["a", "b"]);
  assert.equal(frontmatter.title, "x", "the key after a list must still be read");
});

test("an orphan list item is not parsed as a key", () => {
  const { frontmatter } = parseFrontmatter("---\n- stray\ntitle: x\n---\n\n# H\n");
  assert.equal(frontmatter.title, "x");
  assert.equal(frontmatter.aliases, undefined);
});

test("a nested map is skipped rather than flattened", () => {
  // Not part of the schema. Guessing at it would produce a value that looks
  // authoritative and is not, so it is left unread.
  const { frontmatter, body } = parseFrontmatter("---\nauthor:\n  name: x\ntitle: y\n---\n\n# H\n");
  assert.equal(frontmatter.title, "y");
  assert.equal(body, "# H\n");
});

// ---------------------------------------------------------- the real files

test("every supplied knowledge file parses, or is honestly reported as not", () => {
  const dir = join(ROOT, "src", "content", "knowledge");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  assert.ok(files.length > 0, "no knowledge files found");

  const withMeta = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    const parsed = parseFrontmatter(raw);
    if (raw.trimStart().startsWith("---")) {
      withMeta.push(file);
      assert.ok(
        parsed.body.trim().length > 0,
        `${file} has frontmatter but parsing it left no body`,
      );
      assert.equal(
        parsed.body.startsWith("---"),
        false,
        `${file}: frontmatter was not stripped from the body`,
      );
    }
    // Whatever happens, the body is a substring of the file. Nothing invents text.
    assert.ok(
      raw.includes(parsed.body) || parsed.body === "",
      `${file}: body is not a substring of the source`,
    );
  }
  assert.ok(
    withMeta.length > 0,
    "no knowledge file has frontmatter — the bundle was expected to add it",
  );
});

test("the frontmatter title is what ingest will store as the document title", () => {
  // The title is authored deliberately and is the label on a source link, so it
  // takes precedence over the first heading. They differ in the supplied bundle
  // for the projects document, which is exactly the case that proves the order.
  const raw =
    "---\ntitle: Terry Mathew — Projects\n---\n\n# Terry Mathew — Personal Projects\n\nBody.\n";
  const parsed = parseFrontmatter(raw);
  const chosen = parsed.frontmatter.title ?? /^#\s+(.+)$/m.exec(parsed.body)?.[1]?.trim();
  assert.equal(chosen, "Terry Mathew — Projects");
});

test("the H1 is still the fallback when there is no frontmatter title", () => {
  const parsed = parseFrontmatter(PLAIN);
  const chosen = parsed.frontmatter.title ?? /^#\s+(.+)$/m.exec(parsed.body)?.[1]?.trim();
  assert.equal(chosen, "Terry Mathew — Canonical Facts");
});
