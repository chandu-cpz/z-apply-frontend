import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { DataCard, PageShell } from "../components/page-shell";

export function DiagnosticsScreen() {
  const diagnostics = useQuery({ queryKey: ["diagnostics"], queryFn: api.diagnostics, refetchInterval: 5_000 });
  return <PageShell eyebrow="SYSTEM HEALTH" title="Diagnostics" description="Live backend and Core integration health. Values refresh every five seconds.">{diagnostics.isError ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Diagnostics unavailable: {diagnostics.error.message}</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><DataCard label="Core version" value={diagnostics.data?.version || "—"}/><DataCard label="Active runs" value={diagnostics.data?.active_runs ?? "—"} detail={`Capacity ${diagnostics.data?.max_active_runs ?? "—"}`}/><DataCard label="Browser workspace" value={diagnostics.data?.live_view ? "Online" : "Offline"}/><DataCard label="Database" value={diagnostics.data?.database || "—"}/></div>}</PageShell>;
}
