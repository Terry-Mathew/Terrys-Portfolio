// Leading YAML frontmatter for knowledge files.
//
//   ---
//   title: Terry Mathew — Canonical Facts
//   type: canonical_facts
//   priority: 100
//   updated: 2026-10
//   aliases:
//     - Terry Mathew
//     - current role
//   ---
//
//   # Terry Mathew — Canonical Facts
//
//   …the document.
//
// Frontmatter is preserved in the Markdown source and parsed here so it can be
// used for the document title, and is then kept out of everything that indexes or
// compares text: the chunks, the embeddings, the D1 content and FTS rows, and the
// content hash.
//
// Why that separation matters, concretely:
//
//   - Every document would otherwise embed an identical run of metadata tokens.
//     Nine documents carrying `title:` and `priority:` and `updated:` look
//     slightly alike to a vector index for reasons that have nothing to do with
//     what they are about.
//   - BM25 would match a question containing the word "priority" against every
//     document at once.
//   - The hash is what decides whether a document is re-embedded. Metadata that
//     is excluded from it means editing a title does not cost a re-embed, which
//     is the point of having metadata at all.
//
// This is a parser for the small fixed schema above, not a YAML implementation.
// A full parser is several times the size of the Worker bundle and brings its
// own edge cases; this one is ~90 lines, has no dependencies, and is read in one
// sitting.
//
// It is deliberately conservative. A construct it does not understand is
// ignored rather than guessed at, and a file that does not open with a fence is
// returned completely untouched. Nothing here can throw, and nothing here
// rewrites the source file.
//
// `priority` is parsed but not used. Ranking by it is a separate decision, and
// wiring it in before anyone has looked at what it does to recall would be
// guessing.

/** No imports, deliberately — this module is loaded directly by its test. */
export type Frontmatter = {
  title?: string;
  type?: string;
  priority?: number;
  updated?: string;
  aliases?: string[];
};

export type ParsedDocument = {
  /** The parsed metadata. Every field is optional; absence is normal. */
  frontmatter: Frontmatter;
  /**
   * The document with the frontmatter block removed.
   *
   * For a file with no frontmatter this is byte-identical to `raw`. For a file
   * with it, the body is byte-identical to what the same file would have been
   * without the block — so adding or editing frontmatter never changes the hash.
   */
  body: string;
  /** The file exactly as read. Never modified. */
  raw: string;
  /** The frontmatter block itself, fences included, for callers that want more. */
  block: string;
};

const BOM = "\uFEFF";
const FENCE = /^---[ \t]*$/;
const KEY = /^([A-Za-z0-9_-]+)[ \t]*:[ \t]*(.*)$/;
const SEQUENCE_ITEM = /^[ \t]+-[ \t]*(.*)$/;
const INTEGER = /^-?\d+$/;

/**
 * Strip one matched pair of surrounding quotes.
 *
 * No escape sequences are interpreted. The schema has none — the values are
 * human-readable labels — and a half-implemented escape rule is worse than
 * none, because it looks like it is handling quotes when it is not.
 */
function unquote(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

/** Parse the lines between the fences. Unrecognised shapes are skipped. */
function parseBlock(lines: string[]): Frontmatter {
  const values: Record<string, string | string[]> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    // Blank lines, whole-line comments, and orphan list items (a `- item` with
    // no key above it) carry no value this schema has a place for.
    if (!line.trim()) continue;
    if (line.trimStart().startsWith("#")) continue;
    if (SEQUENCE_ITEM.test(line)) continue;

    const match = KEY.exec(line.trim());
    if (!match) continue;
    const key = match[1]!;
    const inline = (match[2] ?? "").trim();

    if (inline) {
      values[key] = unquote(inline);
      continue;
    }

    // A bare `key:` introduces a block sequence. Only `- item` lines are
    // consumed; an indented map or a folded scalar is not something this schema
    // defines, so it is left alone rather than flattened into something wrong.
    const items: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const item = SEQUENCE_ITEM.exec(lines[j] ?? "");
      if (!item) break;
      items.push(unquote((item[1] ?? "").trim()));
    }
    if (items.length > 0) {
      values[key] = items;
      i = j - 1;
    }
  }

  // `values` is an index signature, so this file uses bracket access throughout —
  // the project's tsconfig sets noPropertyAccessFromIndexSignature.
  const priority =
    typeof values["priority"] === "string" && INTEGER.test(values["priority"])
      ? Number(values["priority"])
      : undefined;

  // Keys with no value are omitted rather than set to undefined, so a document
  // with no frontmatter and one with a partial block produce the same shape.
  // A field that is present-and-undefined is easy to mistake for a value.
  const parsed: Frontmatter = {};
  const title = typeof values["title"] === "string" ? values["title"] : undefined;
  const type = typeof values["type"] === "string" ? values["type"] : undefined;
  // `updated: 2026-10` stays the string "2026-10". Coercing it would produce NaN
  // or a Date, and either is worse than the text it came from.
  const updated = typeof values["updated"] === "string" ? values["updated"] : undefined;
  const rawAliases = values["aliases"];
  const aliases = Array.isArray(rawAliases)
    ? rawAliases.filter((a): a is string => typeof a === "string")
    : undefined;

  if (title !== undefined) parsed.title = title;
  if (type !== undefined) parsed.type = type;
  if (priority !== undefined) parsed.priority = priority;
  if (updated !== undefined) parsed.updated = updated;
  if (aliases !== undefined) parsed.aliases = aliases;

  return parsed;
}

/**
 * Split a knowledge file into frontmatter and body.
 *
 * Never throws. A file it does not recognise comes back whole, which means the
 * worst outcome of an unparseable file is that its metadata is ignored — not
 * that its content is lost.
 */
export function parseFrontmatter(raw: string): ParsedDocument {
  const text = raw.startsWith(BOM) ? raw.slice(1) : raw;
  const crlf = text.includes("\r\n");
  const lines = text.split(/\r?\n/);

  const untouched: ParsedDocument = { frontmatter: {}, body: raw, raw, block: "" };

  if (!FENCE.test(lines[0] ?? "")) return untouched;

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FENCE.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }
  // An opening fence with no closing fence is not frontmatter. Treating the rest
  // of the file as metadata would silently discard the document.
  if (end === -1) return untouched;

  const frontmatter = parseBlock(lines.slice(1, end));

  // Slicing from the line after the closing fence consumes that fence and its
  // newline, so the body is what the file would read as without the block.
  // Joining with the original line ending keeps a CRLF file's hash stable.
  const body = lines
    .slice(end + 1)
    .join(crlf ? "\r\n" : "\n")
    // The blank line conventionally left after the closing fence is formatting,
    // not content. Leaving it in would mean the body of a file with frontmatter
    // differs from the same file without it by one leading newline — and the
    // hash covers the body, so adding a title would force a re-embed of a
    // document whose prose had not changed by a single character.
    .replace(/^(?:[ \t]*\r?\n)+/, "");

  return {
    frontmatter,
    body,
    raw,
    block: lines.slice(0, end + 1).join(crlf ? "\r\n" : "\n"),
  };
}
