import { Ban, BriefcaseBusiness, ExternalLink, Sparkles } from "lucide-react";
import type { Run } from "../types";

export function RunContext({ run, onCancel }: { run: Run; onCancel(): void }) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-r border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><BriefcaseBusiness size={18} /></span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-stone-900 dark:text-zinc-100">{run.company || hostname(run.job_url)}</h2>
            <p className="mt-1 truncate text-xs text-stone-500 dark:text-zinc-500">{run.role || "Role details loading"}</p>
          </div>
        </div>
        <a className="mt-3 flex items-center gap-1.5 text-xs text-stone-500 hover:text-violet-700 dark:text-zinc-500 dark:hover:text-violet-300" href={run.job_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Source job</a>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="font-mono text-[9px] tracking-[.12em] text-stone-400 uppercase">Run objective</p>
        <p className="mt-2 text-xs leading-relaxed text-stone-700 dark:text-zinc-300">
          {run.task || "Complete the application carefully, verify it, and request approval before submission."}
        </p>
      </div>

      <div className="px-1">
        <p className="font-mono text-[10px] tracking-[.12em] text-stone-400 dark:text-zinc-600">CURRENT ACTIVITY</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-stone-700 dark:text-zinc-300"><Sparkles className="text-violet-500" size={15} /><span className="truncate capitalize">{run.current_agent || "Orchestrator"}</span></div>
        <p className="mt-1 pl-6 text-xs capitalize text-stone-500 dark:text-zinc-500">{run.phase.replaceAll("_", " ")}</p>
      </div>

      {run.summary && <p className="max-h-28 overflow-hidden border-l-2 border-stone-300 pl-3 text-xs leading-relaxed text-stone-500 dark:border-zinc-700 dark:text-zinc-500" title={run.summary}>{run.summary}</p>}

      {run.status !== "terminal" && <button className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" onClick={onCancel}><Ban size={14} /> Cancel run</button>}
    </aside>
  );
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "Application"; } }
