import { useQuery } from "@tanstack/react-query";
import { Download, FileArchive } from "lucide-react";
import { useState } from "react";
import { api } from "../api";
import { PageShell } from "../components/page-shell";
import type { Run } from "../types";

export function ArtifactsScreen({ runs }: { runs: Run[] }) {
  const [runId, setRunId] = useState(runs[0]?.id ?? "");
  const selectedRunId = runId || runs[0]?.id || "";
  const artifacts = useQuery({ queryKey: ["artifacts", selectedRunId], queryFn: () => api.artifacts(selectedRunId), enabled: Boolean(selectedRunId) });
  return <PageShell eyebrow="EVIDENCE VAULT" title="Run artifacts" description="Screenshots, documents, and submission evidence exposed by Core for the selected application." action={<select className="max-w-xs rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={selectedRunId} onChange={(event) => setRunId(event.target.value)}>{runs.map((run) => <option value={run.id} key={run.id}>{run.company || hostname(run.job_url)} · {run.role || run.phase}</option>)}</select>}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{artifacts.data?.map((artifact) => <article className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" key={artifact.artifact_id}><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><FileArchive size={18}/></span><div className="min-w-0"><h2 className="truncate text-sm font-medium">{artifact.filename}</h2><p className="mt-1 font-mono text-[9px] uppercase text-stone-400">{artifact.kind} · {formatBytes(artifact.size_bytes)}</p></div><a className="ml-auto grid size-8 place-items-center rounded-md border border-stone-200 text-stone-500 hover:text-violet-700 dark:border-zinc-700" href={`/api/v1/artifacts/${artifact.artifact_id}`} title="Download artifact"><Download size={15}/></a></article>)}</div>{artifacts.isLoading && <p className="text-sm text-stone-500">Loading run artifacts…</p>}{artifacts.isError && <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Artifacts are unavailable: {artifacts.error.message}</p>}{artifacts.data?.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-zinc-700">No artifacts have been published for this run.</p>}</PageShell>;
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "Application"; } }
function formatBytes(value: number): string { if (value < 1024) return `${value} B`; if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 ** 2).toFixed(1)} MB`; }
