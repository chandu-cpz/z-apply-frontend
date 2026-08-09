import { Ban, BriefcaseBusiness, CheckCircle2, ExternalLink, PanelRight, ReceiptText, Sparkles, Timer, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";
import { useModelPerformance } from "../lib/perf";
import type { Artifact, Run } from "../types";
import { CallsDrawer } from "./calls-drawer";

export function RunContext({ run, onCancel, onOpenSubagents }: { run: Run; onCancel(): void; onOpenSubagents(): void }) {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  const [callsOpen, setCallsOpen] = useState(false);
  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-r border-border bg-muted/40 p-3 dark:bg-zinc-950">
      {submitted && <SubmissionSuccess run={run} />}
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

      <RunStats runId={run.id} />

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
        <button
          type="button"
          onClick={() => setCallsOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground shadow-sm hover:border-violet-300 hover:text-violet-700 dark:hover:border-violet-800 dark:hover:text-violet-300"
        >
          <ReceiptText size={14} />
          LLM calls
        </button>
      </div>

      {run.summary && <p className="max-h-28 overflow-hidden border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground" title={run.summary}>{run.summary}</p>}

      {run.status !== "terminal" && <button className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" onClick={onCancel}><Ban size={14} /> Cancel run</button>}
      {callsOpen && <CallsDrawer runId={run.id} onClose={() => setCallsOpen(false)} />}
    </aside>
  );
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "Application"; } }

function SubmissionSuccess({ run }: { run: Run }) {
  const { data: artifacts } = useQuery({
    queryKey: ["run-artifacts", run.id],
    queryFn: () => api.artifacts(run.id),
    enabled: run.outcome === "submitted_verified",
    refetchInterval: 8_000,
  });
  const confirmation = byKind(artifacts, "submission_confirmation");
  const review = byKind(artifacts, "review_screenshot");
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-300/60 bg-emerald-50 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40">
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={18} />
        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Application submitted</span>
        <span className="ml-auto rounded-full bg-emerald-200/70 px-2 py-0.5 font-mono text-[10px] text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">✓ verified</span>
      </div>
      {durationLabel(run) && (
        <p className="flex items-center gap-1.5 px-3.5 pb-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
          <Timer size={12} /> took {durationLabel(run)}
        </p>
      )}
      {confirmation && (
        <a
          href={`/api/v1/artifacts/${confirmation.artifact_id}`}
          target="_blank"
          rel="noreferrer"
          className="block border-y border-emerald-200/70 bg-white p-2 dark:border-emerald-900/60 dark:bg-zinc-950"
        >
          <img
            src={`/api/v1/artifacts/${confirmation.artifact_id}`}
            alt="Submission confirmation screenshot"
            className="mx-auto max-h-72 w-auto rounded-lg object-contain"
          />
        </a>
      )}
      {run.summary && (
        <p className="px-3.5 pt-2 pb-3 text-[13px] leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">{run.summary}</p>
      )}
      {review && (
        <details className="border-t border-emerald-200/70 px-3.5 py-2 dark:border-emerald-900/60">
          <summary className="cursor-pointer text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Pre-submit review screenshot</summary>
          <a href={`/api/v1/artifacts/${review.artifact_id}`} target="_blank" rel="noreferrer" className="mt-2 block">
            <img
              src={`/api/v1/artifacts/${review.artifact_id}`}
              alt="Application review screenshot"
              className="mx-auto max-h-56 w-auto rounded-lg object-contain"
            />
          </a>
        </details>
      )}
    </div>
  );
}

function durationLabel(run: Run): string | null {
  if (!run.started_at || !run.finished_at) return null;
  const start = Date.parse(run.started_at);
  const end = Date.parse(run.finished_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const seconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function byKind(artifacts: Artifact[] | undefined, kind: string): Artifact | undefined {
  return artifacts?.find((artifact) => artifact.kind === kind);
}

function RunStats({ runId }: { runId: string }) {
  const perf = useModelPerformance(runId);
  const calls = perf.reduce((sum, item) => sum + item.calls, 0);
  const inTokens = perf.reduce((sum, item) => sum + item.totalInputTokens, 0);
  const outTokens = perf.reduce((sum, item) => sum + item.totalOutputTokens, 0);
  const cacheRate = perf.length ? perf.reduce((sum, item) => sum + item.cacheHitRate, 0) / perf.length : 0;
  const costUsd = perf.reduce((sum, item) => sum + item.costUsd, 0);
  if (calls === 0) return null;
  const cell = "rounded-lg border border-border bg-card px-2 py-1.5";
  const value = "block font-mono text-[13px] font-semibold text-foreground";
  const label = "block text-[9px] font-mono uppercase tracking-[.1em] text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="font-mono text-[11px] tracking-[.12em] text-muted-foreground uppercase">Run stats</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className={cell}><span className={value}>{calls}</span><span className={label}>calls</span></div>
        <div className={cell}><span className={value}>{fmtCompact(inTokens)}</span><span className={label}>in tokens</span></div>
        <div className={cell}><span className={value}>{fmtCompact(outTokens)}</span><span className={label}>out</span></div>
        <div className={cell}><span className={value}>{cacheRate > 0 ? `${(cacheRate * 100).toFixed(0)}%` : "—"}</span><span className={label}>cache</span></div>
        <div className={cell}><span className={value}>${costUsd.toFixed(3)}</span><span className={label}>cost</span></div>
        <div className={cell}><span className={value}>{perf[0] ? perf[0].model.split("-")[0] : "—"}</span><span className={label}>model</span></div>
      </div>
    </div>
  );
}

function fmtCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}
