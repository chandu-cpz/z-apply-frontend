import { ArrowUpRight } from "lucide-react";
import { cn } from "../lib/utils";
import type { Run } from "../types";
import { PageShell } from "../components/page-shell";

function statusChip(run: Run): { label: string; cls: string; dot: string } {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  const waiting = run.status === "waiting_human" || run.status === "human_control";
  const running = run.status === "running" || run.status === "starting";
  if (submitted) return { label: "submitted", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", dot: "bg-emerald-500" };
  if (failed) return { label: "failed", cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", dot: "bg-rose-500" };
  if (waiting) return { label: "needs you", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", dot: "bg-amber-500 animate-pulse" };
  if (running) return { label: "running", cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300", dot: "bg-violet-500 animate-pulse" };
  return { label: run.outcome?.replaceAll("_", " ") || "finished", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300", dot: "bg-zinc-400" };
}

/** Application identity: company on top, role (or hostname) under it — never
 * the same string twice, full URL on hover. */
function AppIdentity({ run }: { run: Run }) {
  const title = run.company || hostname(run.job_url);
  const subtitle = run.role || (run.company ? hostname(run.job_url) : "");
  return (
    <>
      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100" title={run.job_url}>
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500" title={run.role ? run.role : run.job_url}>
          {subtitle}
        </p>
      )}
    </>
  );
}

function RunRowCard({ run, onOpen }: { run: Run; onOpen(run: Run): void }) {
  const chip = statusChip(run);
  return (
    <button
      className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-violet-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-800"
      onClick={() => onOpen(run)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <AppIdentity run={run} />
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", chip.cls)}>
          <span className={cn("size-1.5 rounded-full", chip.dot)} />
          {chip.label}
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{run.phase.replaceAll("_", " ")}</span>
        <span className="ml-auto text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{formatDate(run.started_at || run.created_at)}</span>
      </div>
    </button>
  );
}

export function HistoryScreen({ runs, onOpen }: { runs: Run[]; onOpen(run: Run): void }) {
  return (
    <PageShell title="Runs" description="Every application this cockpit has run. Open one to see the full conversation, browser state, and artifacts.">
      <div className="grid gap-3 md:hidden">
        {runs.map((run) => (
          <RunRowCard key={run.id} run={run} onOpen={onOpen} />
        ))}
        {runs.length === 0 && <EmptyState />}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full table-fixed text-left text-[13px]">
          <thead className="bg-zinc-50/80 text-[11px] text-zinc-400 dark:bg-zinc-950/40 dark:text-zinc-500">
            <tr>
              <th className="w-[30%] px-4 py-3 font-medium">Application</th>
              <th className="w-[14%] px-4 py-3 font-medium">Status</th>
              <th className="w-[14%] px-4 py-3 font-medium">Phase</th>
              <th className="w-[16%] px-4 py-3 font-medium">Outcome</th>
              <th className="w-[22%] px-4 py-3 font-medium">Started</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const chip = statusChip(run);
              return (
                <tr
                  className="cursor-pointer border-t border-zinc-100 transition-colors hover:bg-violet-50/40 dark:border-zinc-800 dark:hover:bg-violet-950/20"
                  key={run.id}
                  onClick={() => onOpen(run)}
                >
                  <td className="px-4 py-3">
                    <AppIdentity run={run} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", chip.cls)}>
                      <span className={cn("size-1.5 rounded-full", chip.dot)} />
                      {chip.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300">{run.phase.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300">{run.outcome?.replaceAll("_", " ") || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(run.started_at || run.created_at)}</td>
                  <td>
                    <span className="grid size-8 place-items-center rounded-lg text-zinc-400 dark:text-zinc-500">
                      <ArrowUpRight size={15} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {runs.length === 0 && <EmptyState />}
      </div>
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <p className="text-sm text-zinc-400 dark:text-zinc-500">No applications have been recorded yet.</p>
      <p className="mt-1 text-xs text-zinc-400/70 dark:text-zinc-600">Start one from the New screen and it will appear here.</p>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Application";
  }
}
function formatDate(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
