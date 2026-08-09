import { Ban, BriefcaseBusiness, CheckCircle2, ExternalLink, PanelRight, Sparkles, XCircle } from "lucide-react";
import type { Run } from "../types";

export function RunContext({ run, onCancel, onOpenSubagents }: { run: Run; onCancel(): void; onOpenSubagents(): void }) {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-r border-border bg-muted/40 p-3 dark:bg-zinc-950">
      {submitted && (
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50 p-3.5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={18} />
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Application submitted</span>
          </div>
          {run.summary && <p className="mt-2 text-[13px] leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">{run.summary}</p>}
        </div>
      )}
      {failed && (
        <div className="rounded-xl border border-rose-300/60 bg-rose-50 p-3.5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40">
          <div className="flex items-center gap-2">
            <XCircle className="text-rose-600 dark:text-rose-300" size={18} />
            <span className="text-sm font-semibold text-rose-800 dark:text-rose-200">Run ended {run.outcome ?? "unsuccessfully"}</span>
          </div>
          {run.summary && <p className="mt-2 text-[13px] leading-relaxed text-rose-900/80 dark:text-rose-100/80">{run.summary}</p>}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><BriefcaseBusiness size={18} /></span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{run.company || hostname(run.job_url)}</h2>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">{run.role || "Role details loading"}</p>
          </div>
        </div>
        <a className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-violet-700 dark:hover:text-violet-300" href={run.job_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Source job</a>
      </div>

      <div className="rounded-xl border border-border bg-card p-3.5">
        <p className="font-mono text-[11px] tracking-[.12em] text-muted-foreground uppercase">Run objective</p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
          {run.task || "Complete the application carefully, verify it, and request approval before submission."}
        </p>
      </div>

      <div className="px-1">
        <p className="font-mono text-[11px] tracking-[.12em] text-muted-foreground uppercase">Current activity</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-foreground"><Sparkles className="text-violet-500" size={15} /><span className="truncate capitalize">{run.current_agent || "Orchestrator"}</span></div>
        <p className="mt-1 pl-6 text-[13px] capitalize text-muted-foreground">{run.phase.replaceAll("_", " ")}</p>
        <button
          type="button"
          onClick={onOpenSubagents}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground shadow-sm hover:border-violet-300 hover:text-violet-700 dark:hover:border-violet-800 dark:hover:text-violet-300"
        >
          <PanelRight size={14} />
          Subagents
        </button>
      </div>

      {run.summary && <p className="max-h-28 overflow-hidden border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground" title={run.summary}>{run.summary}</p>}

      {run.status !== "terminal" && <button className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" onClick={onCancel}><Ban size={14} /> Cancel run</button>}
    </aside>
  );
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "Application"; } }
