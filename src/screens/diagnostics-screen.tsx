import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { DataCard, PageShell } from "../components/page-shell";
import { cn } from "../lib/utils";

export function DiagnosticsScreen() {
  const diagnostics = useQuery({ queryKey: ["diagnostics"], queryFn: api.diagnostics, refetchInterval: 5_000 });
  const activeRuns = diagnostics.data?.active_runs;
  const maxRuns = diagnostics.data?.max_active_runs;
  const capacityPct =
    activeRuns != null && maxRuns != null && maxRuns > 0
      ? Math.min(100, Math.max(0, Math.round((activeRuns / maxRuns) * 100)))
      : 0;

  return (
    <PageShell
      title="Diagnostics"
      description="Live backend and Core integration health. Values refresh every five seconds."
    >
      {diagnostics.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Diagnostics unavailable: {diagnostics.error.message}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DataCard label="Core version" value={diagnostics.data?.version || "—"} />
            <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2 lg:col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Capacity</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                  {activeRuns ?? "—"} / {maxRuns ?? "—"} active
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full border border-border bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">max concurrent applications</p>
            </div>
            <DataCard label="Database" value={diagnostics.data?.database || "—"} />
          </div>

          <section className="mt-4 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Services</h2>
            <dl className="mt-1 divide-y divide-border">
              <ServiceRow
                name="Browser workspace"
                dot={diagnostics.data?.live_view ? "bg-success" : "bg-destructive"}
                value={diagnostics.data?.live_view ? "Online" : "Offline"}
              />
              <ServiceRow
                name="Live event stream"
                dot={
                  !diagnostics.data?.live_stream
                    ? "bg-muted-foreground"
                    : diagnostics.data.live_stream.dropped_events === 0
                      ? "bg-success"
                      : "bg-warning"
                }
                value={
                  diagnostics.data?.live_stream
                    ? `${diagnostics.data.live_stream.subscribers} subscribed · ${diagnostics.data.live_stream.dropped_events} dropped`
                    : "Unknown"
                }
              />
              <ServiceRow
                name="Database"
                dot={
                  !diagnostics.data?.database
                    ? "bg-muted-foreground"
                    : diagnostics.data.database === "connected"
                      ? "bg-success"
                      : "bg-destructive"
                }
                value={diagnostics.data?.database || "—"}
              />
            </dl>
          </section>
        </>
      )}
    </PageShell>
  );
}

function ServiceRow({ name, dot, value }: { name: string; dot: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="flex min-w-0 items-center gap-2.5 text-sm text-foreground">
        <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
        {name}
      </dt>
      <dd className="shrink-0 text-sm text-muted-foreground">{value}</dd>
    </div>
  );
}
