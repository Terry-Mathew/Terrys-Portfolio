import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Layout for /projects and /projects/:projectId.
 *
 * Deliberately renders nothing but the outlet. The two children need different
 * headers — the archive opens with "← Terry Mathew", the detail page with
 * "← All projects" — so a shared header here would be wrong for one of them.
 */
export const Route = createFileRoute("/projects")({
  component: () => <Outlet />,
});
