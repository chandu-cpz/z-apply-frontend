import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell, ArtifactsWorkspace, HistoryWorkspace, HomeGate, NewApplicationScreen, NotFound, RunWorkspace } from "./app";
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

/** "/" is the operator's question "what is my agent doing right now?".
 * The gate routes to the newest live run's cockpit; with no live run it
 * shows the launch form (never used) or the queue (runs exist, all done).
 * The launch form itself also owns /new directly. */
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeGate });
const newRoute = createRoute({ getParentRoute: () => rootRoute, path: "/new", component: NewApplicationScreen });
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

const routeTree = rootRoute.addChildren([indexRoute, newRoute, runRoute, historyRoute, artifactsRoute, settingsRoute, diagnosticsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
