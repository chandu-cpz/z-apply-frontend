import { useQuery } from "@tanstack/react-query";
import { Download, FileArchive } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { hostnameOf } from "../lib/format";
import { PageShell } from "../components/page-shell";
import { useArtifacts, useSyncStore } from "../sync-store";
import type { Run } from "../types";

export function ArtifactsScreen({ runs }: { runs: Run[] }) {
  const [runId, setRunId] = useState(runs[0]?.id ?? "");
  const selectedRunId = runId || runs[0]?.id || "";
  // Bootstrap once per selected run; live updates arrive via artifact.created
  // events through the sync store.
  const artifactsQuery = useQuery({
    queryKey: ["run-artifacts", selectedRunId],
    queryFn: () => api.artifacts(selectedRunId),
    enabled: Boolean(selectedRunId),
    staleTime: Infinity,
  });
  useEffect(() => {
    if (artifactsQuery.data) useSyncStore.getState().seedArtifacts(selectedRunId, artifactsQuery.data);
  }, [selectedRunId, artifactsQuery.data]);
  const artifacts = useArtifacts(selectedRunId);
  return <PageShell eyebrow="EVIDENCE VAULT" title="Run artifacts" description="Screenshots, documents, and submission evidence exposed by Core for the selected application." action={<select className="max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground" value={selectedRunId} onChange={(event) => setRunId(event.target.value)}>{runs.map((run) => <option value={run.id} key={run.id}>{run.company || hostnameOf(run.job_url)} · {run.role || run.phase}</option>)}</select>}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{artifacts.map((artifact) => <article className="flex items-center gap-3 rounded-xl border border-border bg-card p-4" key={artifact.artifact_id}><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileArchive size={18}/></span><div className="min-w-0"><h2 className="truncate text-sm font-medium">{artifact.filename}</h2><p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">{artifact.kind} · {formatBytes(artifact.size_bytes)}</p></div><a className="ml-auto grid size-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-primary" href={`/api/v1/artifacts/${artifact.artifact_id}`} title="Download artifact"><Download size={15}/></a></article>)}</div>{artifactsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading run artifacts…</p>}{artifactsQuery.isError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Artifacts are unavailable: {artifactsQuery.error.message}</p>}{!artifactsQuery.isLoading && artifacts.length === 0 && <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No artifacts have been published for this run.</p>}</PageShell>;
}

function formatBytes(value: number): string { if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 ** 2).toFixed(1)} MB`; }
