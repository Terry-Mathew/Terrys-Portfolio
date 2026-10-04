/** Touch keyboards keep Enter as a newline. Desktop keyboards retain Enter to send. */
export function shouldSendOnEnter(
  event: { key: string; shiftKey: boolean; isComposing: boolean },
  touchInput: boolean,
): boolean {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing && !touchInput;
}

/** Keep an active response attached to its conversation until generation finishes. */
export function resetChatIfIdle(active: boolean, reset: () => void): boolean {
  if (active) return false;
  reset();
  return true;
}
