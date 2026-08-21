import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell, ArtifactsWorkspace, HistoryWorkspace, NewApplicationScreen, NotFound, RunWorkspace } from "./app";
import { DiagnosticsScreen } from "./screens/diagnostics-screen";
import { SettingsScreen } from "./screens/settings-screen";
import { RouteErrorBoundary } from "./components/route-error-boundary";

/** Route wiring only. Screens live in app.tsx and screens/; this file maps
 * URLs to them and owns the router instance. */

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFound,
  errorComponent: RouteErrorBoundary,
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: NewApplicationScreen });
const runRoute = createRoute({ getParentRoute: () => rootRoute, path: "/runs/$runId", component: RunWorkspace });

/** History list state lives in the URL so filtered views are shareable. */
export const historySearchSchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(["all", "active", "needs_you", "done"]).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: HistoryWorkspace,
  validateSearch: historySearchSchema,
});

const artifactsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/artifacts", component: ArtifactsWorkspace });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: SettingsScreen });
const diagnosticsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/diagnostics", component: DiagnosticsScreen });

const routeTree = rootRoute.addChildren([indexRoute, runRoute, historyRoute, artifactsRoute, settingsRoute, diagnosticsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
