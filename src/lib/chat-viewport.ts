/** The obscured viewport edge includes the keyboard, not only safe-area padding. */
export function chatViewportGeometry(
  layoutHeight: number,
  viewportHeight: number,
  offsetTop: number,
): { height: number; bottomInset: number } {
  const height = Math.max(0, Math.min(layoutHeight, viewportHeight));
  return { height, bottomInset: Math.max(0, layoutHeight - height - Math.max(0, offsetTop)) };
}

export function observeChatViewport(root: HTMLElement, target: Window): () => void {
  const viewport = target.visualViewport;
  if (!viewport) return () => {};
  let frame = 0;
  const update = () => {
    frame = 0;
    const geometry = chatViewportGeometry(target.innerHeight, viewport.height, viewport.offsetTop);
    root.style.setProperty("--chat-viewport-height", `${geometry.height}px`);
    root.style.setProperty("--chat-keyboard-inset", `${geometry.bottomInset}px`);
  };
  const schedule = () => {
    if (!frame) frame = target.requestAnimationFrame(update);
  };
  update();
  viewport.addEventListener("resize", schedule);
  viewport.addEventListener("scroll", schedule);
  target.addEventListener("resize", schedule);
  return () => {
    viewport.removeEventListener("resize", schedule);
    viewport.removeEventListener("scroll", schedule);
    target.removeEventListener("resize", schedule);
    if (frame) target.cancelAnimationFrame(frame);
    root.style.removeProperty("--chat-viewport-height");
    root.style.removeProperty("--chat-keyboard-inset");
  };
}
