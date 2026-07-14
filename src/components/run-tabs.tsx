import { Plus, X } from "lucide-react";
import type { Run } from "../types";

interface Props { runs: Run[]; selected?: string; onSelect: (run: Run) => void; onNew: () => void; }

export function RunRail({ runs, selected, onSelect, onNew }: Props) {
  return <nav className="border-b border-zinc-800 bg-zinc-950 p-3" aria-label="Application runs">
    <div className="mb-2 flex items-center justify-between px-1"><span className="font-mono text-[10px] tracking-[.12em] text-zinc-500">APPLICATIONS</span><span className="font-mono text-[10px] text-zinc-600">{runs.length}</span></div>
    <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
    {runs.map((run) => <button className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${selected === run.id ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`} onClick={() => onSelect(run)} key={run.id}>
      <span className={`size-1.5 shrink-0 rounded-full ${statusColor(run.status)}`} />
      <span className="grid min-w-0 gap-0.5"><b className="truncate text-xs font-medium">{run.company || hostname(run.job_url)}</b><small className="truncate font-mono text-[9px] uppercase text-zinc-500">{run.role || run.phase}</small></span>
      {run.status === "waiting_human" && <span className="ml-auto grid size-4 place-items-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-950">!</span>}
      {run.status === "terminal" && <X className="ml-auto text-zinc-600" size={14} aria-hidden="true" />}
    </button>)}
    </div>
    <button className="mt-2 flex w-full items-center gap-2 rounded-md border border-zinc-800 px-2.5 py-2 text-xs text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100" onClick={onNew}><Plus size={15} /> New application</button>
  </nav>;
}

function statusColor(status: Run["status"]): string {
  if (status === "running" || status === "starting") return "bg-cyan-300";
  if (status === "waiting_human") return "bg-amber-300 shadow-sm shadow-amber-300";
  return "bg-slate-500";
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "New application"; } }
