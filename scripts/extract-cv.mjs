// Converts the private CV source into a private local text copy.
//
// Runs automatically on `npm run build` (see the "prebuild" script in
// package.json). The output stays outside the public chatbot knowledge corpus.
//
// Requires `pdftotext` (poppler-utils). On macOS: brew install poppler
// If it is missing the script warns and exits 0, leaving any previously
// generated file in place, so a build on a machine without poppler still
// succeeds — it leaves the previous private text copy in place.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pdfPath = join(root, "private", "Terry-Mathew-CV.pdf");
const outPath = join(root, "private", "generated", "Terry-Mathew-CV.md");

if (!existsSync(pdfPath)) {
  console.log("[extract-cv] private source not present; no private text copy was updated.");
  process.exit(0);
}

// Skip regeneration when the output is already newer than the PDF. Keeps local
// dev builds fast and avoids needless file churn.
if (existsSync(outPath) && statSync(outPath).mtimeMs >= statSync(pdfPath).mtimeMs) {
  console.log("[extract-cv] private text copy is up to date.");
  process.exit(0);
}

let text;
try {
  text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
} catch (error) {
  console.warn("[extract-cv] pdftotext is not available. Install poppler (brew install poppler).");
  console.warn("[extract-cv] The private text copy is stale or missing.");
  process.exit(0);
}

// pdftotext -layout preserves PDF column geometry, which leaves large runs of
// spaces. Collapse them, drop HTML comments, and promote the resume's ALL-CAPS
// section labels to markdown headings so the chunker can split on structure.
const cleaned = text
  .replace(/\r\n/g, "\n")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/[ \t]{3,}/g, "  ")
  .split("\n")
  .map((line) => line.trim())
  .filter((line, i, all) => line.length > 0 || all[i - 1]?.length > 0)
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .split("\n")
  .map((line) => {
    // "PROFESSIONAL SUMMARY" -> "## Professional summary"
    // Guards against matching a name or a single word.
    if (/^[A-Z][A-Z &/,\-]{3,60}$/.test(line) && line.length > 4) {
      const titled = line.charAt(0) + line.slice(1).toLowerCase();
      return `## ${titled}`;
    }
    return line;
  })
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

if (cleaned.length < 200) {
  console.warn("[extract-cv] extracted text looks empty — leaving the private file alone.");
  process.exit(0);
}

const body = `# Resume

<!-- Private text copy generated from private/Terry-Mathew-CV.pdf.
     Edit the PDF, not this file — this file is overwritten on every build. -->

${cleaned}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, body, "utf8");
console.log(`[extract-cv] wrote ${outPath} (${cleaned.length} chars from the PDF)`);
