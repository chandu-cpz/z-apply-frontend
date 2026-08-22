import { AlertTriangle, RotateCcw } from "lucide-react";
import { useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "./ui/button";

/** Route-level error boundary: one honest card with retry and escape hatches.
 * Rendered by the router whenever a route throws; never used decoratively. */
export function RouteErrorBoundary({ error }: ErrorComponentProps) {
  const navigate = useNavigate();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <main className="grid min-h-[calc(100dvh_-_3.5rem)] place-items-center p-8">
      <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={18} className="shrink-0 text-destructive" />
          <h1 className="text-sm font-semibold text-foreground">This screen failed to render</h1>
        </div>
        <p className="mt-2 break-words font-mono text-[12.5px] leading-5 tabular-nums text-muted-foreground">{message}</p>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RotateCcw size={14} /> Reload
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate({ to: "/" })}>
            Back to start
          </Button>
        </div>
      </div>
    </main>
  );
}
