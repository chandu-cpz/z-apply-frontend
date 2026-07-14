import { Plus, X } from "lucide-react";
import type { Run } from "../types";

interface Props { runs: Run[]; selected?: string; onSelect: (run: Run) => void; onNew: () => void; }

export function RunRail({ runs, selected, onSelect, onNew }: Props) {
  return <nav className="border-b border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950" aria-label="Application runs">
    <div className="mb-2 flex items-center justify-between px-1"><span className="font-mono text-[10px] tracking-[.12em] text-stone-500 dark:text-zinc-500">APPLICATIONS</span><span className="font-mono text-[10px] text-stone-400 dark:text-zinc-600">{runs.length}</span></div>
    <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
    {runs.map((run) => <button className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${selected === run.id ? "bg-violet-50 text-violet-950 dark:bg-violet-950/60 dark:text-violet-100" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"}`} onClick={() => onSelect(run)} key={run.id}>
      <span className={`size-1.5 shrink-0 rounded-full ${statusColor(run.status)}`} />
      <span className="grid min-w-0 gap-0.5"><b className="truncate text-xs font-medium">{run.company || hostname(run.job_url)}</b><small className="truncate font-mono text-[9px] uppercase text-stone-400 dark:text-zinc-600">{run.role || run.phase}</small></span>
      {run.status === "waiting_human" && <span className="ml-auto grid size-4 place-items-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-950">!</span>}
      {run.status === "terminal" && <X className="ml-auto text-stone-400" size={14} aria-hidden="true" />}
    </button>)}
    </div>
    <button className="mt-2 flex w-full items-center gap-2 rounded-md border border-stone-300 px-2.5 py-2 text-xs text-stone-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-violet-950/50 dark:hover:text-violet-200" onClick={onNew}><Plus size={15} /> New application</button>
  </nav>;
}

function statusColor(status: Run["status"]): string {
  if (status === "running" || status === "starting") return "bg-cyan-300";
  if (status === "waiting_human") return "bg-amber-300 shadow-sm shadow-amber-300";
  return "bg-slate-500";
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "New application"; } }
