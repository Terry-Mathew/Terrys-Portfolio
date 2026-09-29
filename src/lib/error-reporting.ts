// Generic client-side error reporter. No third-party telemetry.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[app-error]", { route: window.location.pathname, ...context }, error);
}
