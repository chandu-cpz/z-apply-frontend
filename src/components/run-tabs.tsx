import { PanelLeftClose, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hostnameOf } from "@/lib/format";
import { getRunStatusMeta } from "@/lib/run-status";
import type { Run } from "../types";

interface Props { runs: Run[]; selected?: string; onSelect: (run: Run) => void; onNew: () => void; onCollapse(): void; }

export function RunRail({ runs, selected, onSelect, onNew, onCollapse }: Props) {
  return <nav className="border-b border-border bg-background p-3 dark:bg-zinc-950" aria-label="Application runs">
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="font-mono text-[11px] tracking-[.12em] text-muted-foreground">APPLICATIONS</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{runs.length}</span>
        <button className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onCollapse} title="Collapse sidebar"><PanelLeftClose size={14} /></button>
      </div>
    </div>
    <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
      {runs.map((run) => (
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition",
            selected === run.id
              ? "bg-violet-50 text-violet-950 dark:bg-violet-950/60 dark:text-violet-100"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={() => onSelect(run)}
          key={run.id}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", getRunStatusMeta(run).dot)} />
          <span className="grid min-w-0 gap-0.5">
            <b className="truncate text-[13px] font-medium">{run.company || hostnameOf(run.job_url, "New application")}</b>
            <small className="truncate text-xs text-muted-foreground">{run.role || run.phase.replaceAll("_", " ")}</small>
          </span>
          {run.status === "waiting_human" && <span className="ml-auto grid size-4 place-items-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-950">!</span>}
          {run.status === "terminal" && <X className="ml-auto text-muted-foreground" size={14} aria-hidden="true" />}
        </button>
      ))}
    </div>
    <button className="mt-2 flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[13px] text-muted-foreground hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/50 dark:hover:text-violet-200" onClick={onNew}>
      <Plus size={15} /> New application
    </button>
  </nav>;
}



