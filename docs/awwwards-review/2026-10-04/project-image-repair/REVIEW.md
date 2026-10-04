# Project image repair — 2026-10-04

## Result

The Product Discovery and Deep Research case studies omitted their artwork.
The detail route previously rendered artwork only when `project.illustration` existed.
Both projects had card artwork in the shared registry, but no illustration record.
The detail route now uses the same artwork resolver as the homepage and archive.
Each case study includes its artwork, caption, and concept image navigation link.

Product Discovery now uses sculptural paper artwork.
The cream, charcoal, and orange palette matches the featured Digital Twin and Settle artwork.
The existing Deep Research artwork remains unchanged.
The old Product Discovery files remain in the source history.

## Assets

Built-in imagegen tool generated the new artwork from 2 style references.
References: `assets/generated/digital-twin-concept.png` and `assets/generated/settle-concept.png`.

- Original: `assets/generated/product-discovery-concept.png`.
- Small: `public/project-art/product-discovery-480.webp`, 17236 bytes.
- Large: `public/project-art/product-discovery-1024.webp`, 64802 bytes.

`cwebp` creates 480×360 and 1024×768 variants at quality 78.
The public caption identifies the artwork as a generated concept illustration.

## Checks

Lint, TypeScript, production build, and diff checks pass.
`scripts/project-images-check.mjs` checks 6 routes and 44 image candidates.
Every candidate returns HTTP 200 with an image content type and a nonempty body.
Every case study contains the concept figure and its navigation link.
Before repair, the 4186 and 4187 preview image files also returned valid image responses.
This check found a missing detail-page figure, not a missing source file.

Preview: http://localhost:4188/

## Limits

Browser decoding and rendered image visibility remain unverified.
The owner's reported page URL has not yet been supplied.
A separate homepage disappearance has not been reproduced.
The live website has not changed.

## Exact generation prompt

Use case: stylized-concept. Asset type: Product Discovery AI portfolio case study artwork. Create a NEW landscape 4:3 image in the same tactile sculptural editorial style as the two references. References are style and palette guides only; do not copy their portrait or branching landscape. Subject: five distinct folded ivory paper research cards with charcoal paper details converge through restrained burnt orange paper ribbons into one carefully layered research brief. This represents separate research roles combining evidence. Warm cream textured paper backdrop, tangible cut paper depth, soft directional studio shadows, charcoal and ivory with small burnt orange accents. Clean focused composition readable as a small website thumbnail. No people, no lettering, no graphs, no UI, no logos, no watermark. This is conceptual artwork, not a screenshot.
