import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowUpDown, ArrowUpRight, ExternalLink } from "lucide-react";
import { hostnameOf } from "../lib/format";
import { getRunStatusMeta } from "../lib/run-status";
import { cn } from "../lib/utils";
import type { Run } from "../types";
import { PageShell } from "../components/page-shell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";

type StatusFilter = "all" | "active" | "needs_you" | "done";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "needs_you", label: "Needs you" },
  { value: "done", label: "Done" },
];

/**
 * Queue priority tiers: the paused-on-you run is always at the top of the
 * list, then work currently under human control or actively running, then
 * anything merely queued, and finished runs sink to the bottom. Within a
 * tier the chosen newest/oldest sort still applies.
 */
const QUEUE_TIERS: Record<Run["status"], number> = {
  waiting_human: 0,
  human_control: 1,
  running: 1,
  queued: 2,
  starting: 2,
  terminal: 3,
};

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

/** Left accent rail: warning for runs paused on you, primary for live work,
 * nothing for queued or terminal rows. Rendered as an absolutely-positioned
 * strip inside the nearest positioned ancestor (row cell / card). */
function railFor(run: Run): string | null {
  if (run.status === "waiting_human") return "bg-warning";
  if (run.status === "running" || run.status === "human_control") return "bg-primary";
  return null;
}

/** Application identity: company on top, role (or hostname) under it — never
 * the same string twice, full URL on hover. The top line reads like a
 * hostname/machine identifier (mono, tabular); the role subtitle stays in
 * the UI voice (Inter via default font stack). */
function AppIdentity({ run }: { run: Run }) {
  const title = run.company || hostnameOf(run.job_url);
  const subtitle = run.role || (run.company ? hostnameOf(run.job_url) : "");
  return (
    <>
      <p className="truncate font-mono text-[12.5px] font-medium tabular-nums text-foreground" title={run.job_url}>
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

function matchesQuery(run: Run, needle: string): boolean {
  if (!needle) return true;
  return (
    (run.company ?? "").toLowerCase().includes(needle) ||
    (run.role ?? "").toLowerCase().includes(needle) ||
    run.job_url.toLowerCase().includes(needle)
  );
}

function matchesStatus(run: Run, status: StatusFilter): boolean {
  switch (status) {
    case "active":
      return run.status === "queued" || run.status === "starting" || run.status === "running";
    case "needs_you":
      return run.status === "waiting_human" || run.status === "human_control";
    case "done":
      return run.status === "terminal";
    default:
      return true;
  }
}

function startedAtMs(run: Run): number {
  return new Date(run.started_at || run.created_at).getTime();
}

/** Coarse relative age ("just now", "12m ago", "3h ago", "2d ago"). */
function relativeAge(ms: number): string {
  const delta = Date.now() - ms;
  if (!Number.isFinite(delta)) return "";
  if (delta < 60_000) return "just now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Relative time cell; hover/title keeps the absolute timestamp. */
function StartedAt({ iso }: { iso: string }) {
  const ms = new Date(iso).getTime();
  return (
    <time className="font-mono text-[11px] tabular-nums text-muted-foreground" dateTime={iso} title={new Date(iso).toLocaleString()}>
      {Number.isNaN(ms) ? "—" : relativeAge(ms)}
    </time>
  );
}

/** Outcome only earns a column when it adds information beyond the status
 * chip; when it repeats the status label we collapse to an em-dash. */
function outcomeLabel(run: Run): string {
  if (!run.outcome) return "—";
  const outcome = run.outcome.replaceAll("_", " ");
  return outcome === statusChip(run).label ? "—" : outcome;
}

function StatusChip({ run }: { run: Run }) {
  const chip = statusChip(run);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", chip.cls)}>
      <span className={cn("size-1.5 rounded-full", chip.dot)} />
      {chip.label}
    </span>
  );
}

function RunRowCard({ run, onOpen }: { run: Run; onOpen(run: Run): void }) {
  const rail = railFor(run);
  return (
    <button
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card p-4 pl-5 text-left transition hover:border-primary/40"
      onClick={(event) => handleRowClick(run, event, onOpen)}
      title={run.job_url}
    >
      {rail && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", rail)} />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <AppIdentity run={run} />
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <ArrowUpRight size={15} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusChip run={run} />
        <span className="ml-auto">
          <StartedAt iso={run.started_at || run.created_at} />
        </span>
      </div>
    </button>
  );
}

export function HistoryScreen({ runs, onOpen }: { runs: Run[]; onOpen(run: Run): void }) {
  const navigate = useNavigate();
  const { q, status = "all", sort = "newest" } = useSearch({ from: "/history" });

  /** Search box keeps a local draft so typing is smooth; it commits to the URL
   * after a 250ms pause. committedQ tracks what the URL already reflects so
   * external q changes (back nav, Clear filters) resync the draft without
   * clobbering in-flight typing. */
  const [queryDraft, setQueryDraft] = useState(q ?? "");
  const committedQ = useRef(q ?? "");

  useEffect(() => {
    if (q === committedQ.current) return;
    committedQ.current = q ?? "";
    setQueryDraft(q ?? "");
  }, [q]);

  useEffect(() => {
    const next = queryDraft.trim();
    if (next === committedQ.current) return;
    const timer = setTimeout(() => {
      committedQ.current = next;
      navigate({ to: "/history", search: (prev) => ({ ...prev, q: next || undefined }) });
    }, 250);
    return () => clearTimeout(timer);
  }, [queryDraft]);

  const setStatusFilter = (next: string) => {
    navigate({ to: "/history", search: (prev) => ({ ...prev, status: next === "all" ? undefined : (next as StatusFilter) }) });
  };

  const toggleSort = () => {
    navigate({ to: "/history", search: (prev) => ({ ...prev, sort: sort === "newest" ? "oldest" : undefined }) });
  };

  const clearFilters = () => {
    committedQ.current = "";
    setQueryDraft("");
    navigate({ to: "/history", search: { q: undefined, status: undefined, sort: undefined } });
  };

  const needle = (q ?? "").trim().toLowerCase();
  /** Queue order first (needs you → live → queued → done); within each tier
   * the URL-driven newest/oldest sort decides. */
  const filtered = runs
    .filter((run) => matchesQuery(run, needle) && matchesStatus(run, status))
    .sort((a, b) => {
      const byTier = QUEUE_TIERS[a.status] - QUEUE_TIERS[b.status];
      if (byTier !== 0) return byTier;
      return sort === "oldest" ? startedAtMs(a) - startedAtMs(b) : startedAtMs(b) - startedAtMs(a);
    });

  return (
    <PageShell title="Runs" description="Every application this cockpit has run. Open one to see the full conversation, browser state, and artifacts. Ctrl/Cmd+click a row to open the job posting.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search applications"
          className="h-9 w-full sm:w-64"
          placeholder="Search company, role, or URL"
          value={queryDraft}
          onChange={(event) => setQueryDraft(event.target.value)}
        />
        <Tabs value={status} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_FILTERS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSort}
          title={`Sort within groups by ${sort === "newest" ? "newest first" : "oldest first"} — click to flip`}
        >
          <ArrowUpDown size={14} />
          {sort === "newest" ? "Newest" : "Oldest"}
        </Button>
        <p className="ml-auto text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
          {filtered.length} of {runs.length} applications
        </p>
      </div>
      <div className="grid gap-3 md:hidden">
        {filtered.map((run) => (
          <RunRowCard key={run.id} run={run} onOpen={onOpen} />
        ))}
        {runs.length === 0 && <EmptyState />}
        {runs.length > 0 && filtered.length === 0 && <NoMatchState onClear={clearFilters} />}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full table-fixed text-left text-[13px]">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
            <tr>
              <th className="w-[32%] px-4 py-3 font-medium">Application</th>
              <th className="w-[16%] px-4 py-3 font-medium">Status</th>
              <th className="w-[18%] px-4 py-3 font-medium">Outcome</th>
              <th className="w-[22%] px-4 py-3 font-medium">Started</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((run) => {
              const rail = railFor(run);
              return (
                <tr
                  className={cn(
                    "group cursor-pointer border-t border-border transition-colors hover:bg-muted/40",
                    run.status === "terminal" && "text-muted-foreground/70",
                  )}
                  key={run.id}
                  onClick={(event) => handleRowClick(run, event, onOpen)}
                  title={run.job_url}
                >
                  <td className="relative px-4 py-2">
                    {rail && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", rail)} />}
                    <AppIdentity run={run} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusChip run={run} />
                  </td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{outcomeLabel(run)}</td>
                  <td className="px-4 py-2">
                    <StartedAt iso={run.started_at || run.created_at} />
                  </td>
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
        {runs.length > 0 && filtered.length === 0 && <NoMatchState onClear={clearFilters} />}
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

function NoMatchState({ onClear }: { onClear(): void }) {
  return (
    <div className="p-10 text-center">
      <p className="text-sm text-muted-foreground">No applications match.</p>
      <Button variant="ghost" size="sm" className="mt-3" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
