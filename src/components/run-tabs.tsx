import { Plus, X } from "lucide-react";
import type { Run } from "../types";

interface Props { runs: Run[]; selected?: string; onSelect: (run: Run) => void; onNew: () => void; }

export function RunTabs({ runs, selected, onSelect, onNew }: Props) {
  return <nav className="run-tabs" aria-label="Application runs">
    {runs.map((run) => <button className={`run-tab ${selected === run.id ? "selected" : ""}`} onClick={() => onSelect(run)} key={run.id}>
      <span className={`status-dot ${run.status}`} />
      <span className="tab-copy"><b>{run.company || hostname(run.job_url)}</b><small>{run.role || run.phase}</small></span>
      {run.status === "waiting_human" && <span className="human-pulse">!</span>}
      {run.status === "terminal" && <X size={14} aria-hidden="true" />}
    </button>)}
    <button className="new-tab" onClick={onNew}><Plus size={16} /> New application</button>
  </nav>;
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "New application"; } }
