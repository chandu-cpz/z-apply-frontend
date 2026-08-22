import { Check, PanelLeftClose, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { hostnameOf } from "@/lib/format";
import { getRunStatusMeta } from "@/lib/run-status";
import type { Run } from "../types";

interface Props { runs: Run[]; selected?: string; onSelect: (run: Run) => void; onNew: () => void; onCollapse(): void; }

export function RunRail({ runs, selected, onSelect, onNew, onCollapse }: Props) {
  return <nav className="border-b border-border bg-sidebar p-3" aria-label="Application runs">
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">Applications</span>
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
              ? "bg-accent text-accent-foreground"
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
          {run.status === "waiting_human" && <span className="ml-auto grid size-4 place-items-center rounded-full bg-warning/20 text-[10px] font-bold text-warning">!</span>}
          {run.status === "terminal" && <Check className="ml-auto text-muted-foreground" size={12} aria-hidden="true" />}
        </button>
      ))}
    </div>
    <button className="mt-2 flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[13px] text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary" onClick={onNew}>
      <Plus size={15} /> New application
    </button>
  </nav>;
}



