import { Plus, X } from "lucide-react";
import type { Run } from "../types";

interface Props { runs: Run[]; selected?: string; onSelect: (run: Run) => void; onNew: () => void; }

export function RunTabs({ runs, selected, onSelect, onNew }: Props) {
  return <nav className="flex h-[58px] items-stretch gap-px overflow-x-auto border-b border-slate-800 bg-slate-950 px-0 sm:px-5" aria-label="Application runs">
    {runs.map((run) => <button className={`relative flex min-w-[190px] max-w-[260px] items-center gap-2 border-l border-slate-800 px-3 text-left text-slate-400 ${selected === run.id ? "bg-gradient-to-b from-slate-800 to-slate-900 text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-violet-300" : "hover:bg-white/5"}`} onClick={() => onSelect(run)} key={run.id}>
      <span className={`size-1.5 shrink-0 rounded-full ${statusColor(run.status)}`} />
      <span className="grid min-w-0 gap-0.5"><b className="truncate text-xs">{run.company || hostname(run.job_url)}</b><small className="truncate font-mono text-[9px] uppercase">{run.role || run.phase}</small></span>
      {run.status === "waiting_human" && <span className="ml-auto grid size-4 place-items-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-950">!</span>}
      {run.status === "terminal" && <X size={14} aria-hidden="true" />}
    </button>)}
    <button className="flex shrink-0 items-center gap-2 px-4 text-xs text-violet-200 hover:text-white" onClick={onNew}><Plus size={16} /> New application</button>
  </nav>;
}

function statusColor(status: Run["status"]): string {
  if (status === "running" || status === "starting") return "bg-sky-300 shadow-sm shadow-sky-300";
  if (status === "waiting_human") return "bg-amber-300 shadow-sm shadow-amber-300";
  return "bg-slate-500";
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "New application"; } }
