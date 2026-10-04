/** Ignore rendered-but-hidden controls, including links in closed details. */
export function dialogFocusTargets(panel: HTMLElement): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'a[href], button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      !element.matches(':disabled, [tabindex="-1"]') &&
      !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden",
  );
}

/** Keep focus inside a dialog even when its panel receives initial focus. */
export function wrapDialogFocus(
  panel: HTMLElement,
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "preventDefault">,
  active: Element | null,
): void {
  if (event.key !== "Tab") return;
  const targets = dialogFocusTargets(panel);
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (!first || !last) return;
  const outsideTargets = !targets.some((element) => element === active);
  if (event.shiftKey && (active === first || outsideTargets)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outsideTargets)) {
    event.preventDefault();
    first.focus();
  }
}
