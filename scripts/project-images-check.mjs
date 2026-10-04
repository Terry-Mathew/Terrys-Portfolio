/** Check the built preview. Run with: node scripts/project-images-check.mjs http://localhost:4188 */
import assert from "node:assert/strict";
const origin = process.argv[2];
assert(origin, "Pass the local preview origin.");
const routes = [
  "/",
  "/projects",
  "/projects/digital-twin",
  "/projects/settle",
  "/projects/product-discovery-ai",
  "/projects/deep-research-agent",
];
const assets = new Set();
for (const route of routes) {
  const response = await fetch(new URL(route, origin));
  assert.equal(response.status, 200, route);
  const html = await response.text();
  if (route.startsWith("/projects/")) {
    assert.match(html, /<figure[^>]+id="project-concept"/, `${route}: missing concept artwork`);
    assert.match(html, /href="#project-concept"/, `${route}: missing image navigation`);
  }
  for (const tag of html.matchAll(/<(?:img|source)\b[^>]*>/g)) {
    for (const attribute of tag[0].matchAll(/(?:src|srcSet|srcset)="([^"]+)"/g)) {
      for (const candidate of attribute[1].split(",")) assets.add(candidate.trim().split(/\s+/)[0]);
    }
  }
}
for (const path of assets) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^image\//,
    `${path}: expected an image, not HTML`,
  );
  assert((await response.arrayBuffer()).byteLength > 100, `${path}: empty image`);
}
console.log(
  JSON.stringify(
    {
      origin,
      routes: routes.length,
      imageAssets: assets.size,
      result: "pass",
      limits: "HTTP checks do not prove browser decoding or rendered visibility.",
    },
    null,
    2,
  ),
);
