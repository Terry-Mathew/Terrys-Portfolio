/** Export the checked-in Digital Twin story for offline visitor review. */
import { build } from "esbuild";
import { writeFile, readFile } from "node:fs/promises";
const result = await build({
  entryPoints: ["src/content/projects.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { getProjectById, caseStudySections } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const project = getProjectById("digital-twin");
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const sections = caseStudySections(project)
  .map(
    ({ key, label }) =>
      `<section><h2>${escape(label)}</h2><p>${escape(project[key])}</p></section>`,
  )
  .join("");
const folder = "docs/awwwards-review/2026-10-04/visitor-review";
await writeFile(
  `${folder}/story.html`,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digital Twin — review story</title><style>body{margin:0;background:#eee7d8;color:#171717;font:17px/1.7 system-ui,sans-serif}main{max-width:800px;margin:auto;padding:32px 20px}h1,h2{font-family:Georgia,serif;line-height:1.2}section{border-top:1px solid #615e56;margin-top:32px}p{white-space:pre-line}a{color:inherit}a:focus-visible{outline:3px solid #9c491f;outline-offset:4px}</style></head><body><main><p>Offline visitor review · Source-backed case study excerpt</p><h1>${escape(project.title)}</h1><p>${escape(project.description)}</p>${sections}<p>This review copy does not run the assistant. Live service checks remain separate.</p><nav aria-label="Review versions"><a href="static.html">Static version</a> · <a href="interactive.html">Interactive version</a></nav></main></body></html>`,
);
for (const version of ["static", "interactive"]) {
  const path = `${folder}/${version}.html`;
  const html = await readFile(path, "utf8");
  await writeFile(path, html.replaceAll('href="/projects/digital-twin"', 'href="story.html"'));
}
console.log("Offline story and both review links are ready.");
