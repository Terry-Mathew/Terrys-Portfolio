# Visitor follow-up audit — 2026-10-04

## Result

The owner reports that visitors think the site looks fine.
This supports the visual direction. It does not establish detailed task results or a controlled prototype comparison.
Reviewer count, devices, browsers, task outcomes, and version preferences were not supplied.
Keep the visitor results form blank rather than inventing those details.

Audited target: current local build at http://localhost:4191/.
The deployed website is not the same verified target.

## Current findings

| Priority | Finding | Source evidence | Effect |
| --- | --- | --- | --- |
| Medium | New chat remains active during generation | ChatWidget New chat clears messages without cancelling the active controller or checking busy | An active response can disappear while generation continues. The new conversation cannot send until busy clears. |
| Medium | Phone Enter behavior differs from the stated design | onComposerKeyDown prevents Enter for every non-composing input without checking input mode | Enter sends on phones despite the comment promising a new line. The keyboard behavior needs correction and device confirmation. |
| Review required | Visual and device quality remain unverified by the agent | Browser inventory has no controlled browser surfaces. Creating a Chrome tab returns Browser is not available: chrome | No current visual, phone, screen reader, keyboard, print, or browser loading pass is claimed. |

These are source findings. No browser reproduction occurred.
No application source changes were made during this audit.

## Verified evidence

The current image integrity check passes for 6 routes and 44 image candidates.
Every checked image returns HTTP 200 with a nonempty image body and an image content type.
The final local build previously passed lint, types, and production build.
The final suite previously had 276 passes, 0 failures, and 3 credential-dependent skips.
Those tests were not rerun during this read-only source audit.
The prior route audit confirmed 8 route statuses, headings, canonical links, image metadata, and sitemap entries.
Those records describe local markup and file integrity, not current rendered appearance.

## Assessment

The visitor report is positive visual feedback.
The current source audit does not justify calling the whole site ready for submission.
Repair the 2 chat findings before the final interaction review.
Retain the static explanation until actual prototype comparison results support a change.
Complete browser/device and loading review before claiming the acceptance gates are closed.

## Category limits

Design: visitors support the current direction. The agent cannot independently inspect the rendered screens.
Usability: source findings remain in the chat controls. Device and assistive technology checks remain open.
Creativity: the original artwork and workflow are implemented. The comparison decision remains unmeasured.
Content: current project scope and concept labels are implemented. Live service and demo results remain separate.
