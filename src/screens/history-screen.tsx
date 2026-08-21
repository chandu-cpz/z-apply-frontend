import { ArrowUpRight, ExternalLink } from "lucide-react";
import { hostnameOf } from "../lib/format";
import { getRunStatusMeta } from "../lib/run-status";
import { cn } from "../lib/utils";
import type { Run } from "../types";
import { PageShell } from "../components/page-shell";

function openJobUrl(run: Run): void {
  window.open(run.job_url, "_blank", "noopener,noreferrer");
}

/** Plain click opens the run; Ctrl/Cmd+click opens the job URL directly. */
function handleRowClick(run: Run, event: React.MouseEvent, onOpen: (run: Run) => void): void {
  if (event.button === 2) return;
  if (event.ctrlKey || event.metaKey) {
    openJobUrl(run);
    return;
  }
  onOpen(run);
}

function statusChip(run: Run): { label: string; cls: string; dot: string } {
  return getRunStatusMeta(run);
}

/** Application identity: company on top, role (or hostname) under it — never
 * the same string twice, full URL on hover. */
function AppIdentity({ run }: { run: Run }) {
  const title = run.company || hostnameOf(run.job_url);
  const subtitle = run.role || (run.company ? hostnameOf(run.job_url) : "");
  return (
    <>
      <p className="truncate text-sm font-semibold text-foreground" title={run.job_url}>
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={run.role ? run.role : run.job_url}>
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
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40"
      onClick={(event) => handleRowClick(run, event, onOpen)}
      title={run.job_url}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <AppIdentity run={run} />
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", chip.cls)}>
          <span className={cn("size-1.5 rounded-full", chip.dot)} />
          {chip.label}
        </span>
        <span className="text-[11px] text-muted-foreground">{run.phase.replaceAll("_", " ")}</span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{formatDate(run.started_at || run.created_at)}</span>
      </div>
    </button>
  );
}

export function HistoryScreen({ runs, onOpen }: { runs: Run[]; onOpen(run: Run): void }) {
  return (
    <PageShell title="Runs" description="Every application this cockpit has run. Open one to see the full conversation, browser state, and artifacts. Ctrl/Cmd+click a row to open the job posting.">
      <div className="grid gap-3 md:hidden">
        {runs.map((run) => (
          <RunRowCard key={run.id} run={run} onOpen={onOpen} />
        ))}
        {runs.length === 0 && <EmptyState />}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full table-fixed text-left text-[13px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
            <tr>
              <th className="w-[30%] px-4 py-3 font-medium">Application</th>
              <th className="w-[14%] px-4 py-3 font-medium">Status</th>
              <th className="w-[14%] px-4 py-3 font-medium">Phase</th>
              <th className="w-[16%] px-4 py-3 font-medium">Outcome</th>
              <th className="w-[18%] px-4 py-3 font-medium">Started</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const chip = statusChip(run);
              return (
                <tr
                  className="group cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                  key={run.id}
                  onClick={(event) => handleRowClick(run, event, onOpen)}
                  title={run.job_url}
                >
                  <td className="px-4 py-2">
                    <AppIdentity run={run} />
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", chip.cls)}>
                      <span className={cn("size-1.5 rounded-full", chip.dot)} />
                      {chip.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{run.phase.replaceAll("_", " ")}</td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{run.outcome?.replaceAll("_", " ") || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(run.started_at || run.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                      title={`Open job posting (${hostnameOf(run.job_url)})`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openJobUrl(run);
                      }}
                    >
                      <ExternalLink size={15} />
                    </button>
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
      <p className="text-sm text-muted-foreground">No applications have been recorded yet.</p>
      <p className="mt-1 text-xs text-muted-foreground/70">Start one from the New screen and it will appear here.</p>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
