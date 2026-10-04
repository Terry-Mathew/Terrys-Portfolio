# Step 13 — Chat contrast and control targets

Date: 2026-10-04.

## Finding

The chat uses reduced-opacity text for status, controls, sources, placeholder text, and keyboard hints.
Opaque token calculations show contrast from 2.10 to 3.84 for the old opacity levels.
The send and stop controls use `size-9`, which is 36 px at the default root size.
Several other controls have no minimum target dimensions.
These are source findings. The translucent rendered panel still needs browser measurement.

## Change

Use the full `bone-dim` token for supporting text.
That token measures 8.62 against opaque `ink-2`.
Set send and stop controls to `size-11`.
Give new chat, close, retry, suggested questions, and source controls minimum 44 px targets.
Give the composer a minimum 44 px height.
Rename New to New chat for a clearer action.
The disabled send control keeps its disabled appearance.

## Checks

Lint, TypeScript, production build, and whitespace checks pass.
The change affects presentation and one control label.
No backend behavior changes.
No implementation-mirroring test is added.

## Limits

Actual target sizes need browser inspection.
Rendered contrast needs checks over the translucent surface.
Narrow phone layout, keyboard, and screen reader checks remain open.
This repair does not establish complete accessibility compliance.
No commit or deploy occurs.
