import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ProjectClosing, ProjectNavigation } from "@/components/site/ProjectNavigation";

/**
 * Layout for /projects and /projects/:projectId.
 *
 * Shared orientation and contact access surround each child's main landmark.
 * Child routes own their project titles and adjacent project navigation.
 */
export const Route = createFileRoute("/projects")({
  component: () => (
    <>
      <ProjectNavigation />
      <Outlet />
      <ProjectClosing />
    </>
  ),
});
