// Renders static image assets. Run with: npm run assets
//
// Sources live in assets/ (edit those, not the output):
//   assets/og-image.svg  -> public/og-image.png          (1200x630, social/OG share card)
//   assets/favicon.png   -> public/apple-touch-icon.png  (180x180, iOS home screen)
//   assets/favicon.png   -> public/icon-192.png, public/icon-512.png
//
// Two rendering paths, because they need different alpha handling:
//   - resvg embeds the PNG via a data URI and renders the exact target size.
//   - Apple touch icons must be opaque (iOS composites transparency onto black,
//     which would swallow the rounded square), so those get an ink backdrop.
//     Browser favicons keep their alpha so the rounded mark reads on a light tab.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "assets");
const publicDir = join(root, "public");
const INK = "#090b0b";

function renderSvg(svg, outPath, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true, defaultFontFamily: "Georgia" },
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`${outPath}  (${width}px)`);
}

// 1. Social share card — from the editable SVG source.
renderSvg(
  readFileSync(join(srcDir, "og-image.svg"), "utf8"),
  join(publicDir, "og-image.png"),
  1200,
);

// 2. Icon set — from the monogram master.
const mark = readFileSync(join(srcDir, "favicon.png")).toString("base64");

const sizedMark = (size, opaque) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    opaque ? `<rect width="${size}" height="${size}" fill="${INK}"/>` : ""
  }<image href="data:image/png;base64,${mark}" x="0" y="0" width="${size}" height="${size}"/></svg>`;

for (const [name, size, opaque] of [
  ["apple-touch-icon.png", 180, true],
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
]) {
  renderSvg(sizedMark(size, opaque), join(publicDir, name), size);
}

// No .ico: PNG favicons are supported by every current browser, and the .ico
// this replaced was an unrelated stock placeholder.
