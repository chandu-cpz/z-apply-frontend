import { Ban, BriefcaseBusiness, Check, CheckCircle2, Copy, ExternalLink, PanelRight, ReceiptText, Sparkles, Timer, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api";
import { useArtifacts, useSyncStore } from "../sync-store";
import type { Artifact, Run } from "../types";
import { hostnameOf } from "../lib/format";
import { getRunStatusMeta } from "../lib/run-status";
import { CallsDrawer } from "./calls-drawer";

export function RunContext({ run, onCancel, onOpenSubagents }: { run: Run; onCancel(): void; onOpenSubagents(): void }) {
  const meta = getRunStatusMeta(run);
  const submitted = meta.state === "submitted";
  const failed = meta.state === "failed";
  const [callsOpen, setCallsOpen] = useState(false);
  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-r border-border bg-sidebar p-3">
      {submitted && <SubmissionSuccess run={run} />}
      {failed && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <XCircle className="text-destructive" size={18} />
            <span className="text-sm font-semibold text-destructive">Run ended {run.outcome ?? "unsuccessfully"}</span>
          </div>
          {run.summary && <p className="mt-2 text-[13px] leading-relaxed text-destructive/80">{run.summary}</p>}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness size={18} /></span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{run.company || hostnameOf(run.job_url)}</h2>
            <p className="mt-1 truncate text-[13px] text-muted-foreground">{run.role || "Role details loading"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <a className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-primary" href={run.job_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Source job</a>
          <CopyJobUrl url={run.job_url} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Run objective</p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
          {run.task || "Complete the application carefully, verify it, and request approval before submission."}
        </p>
      </div>

      <RunStats runId={run.id} active={run.status !== "terminal"} />

      <div className="px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Current activity</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-foreground"><Sparkles className="text-primary" size={15} /><span className="truncate capitalize">{run.current_agent || "Orchestrator"}</span></div>
        <p className="mt-1 pl-6 text-[13px] capitalize text-muted-foreground">{run.phase.replaceAll("_", " ")}</p>
        <button
          type="button"
          onClick={onOpenSubagents}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground shadow-sm hover:border-primary/40 hover:text-primary"
        >
          <PanelRight size={14} />
          Subagents
        </button>
        <button
          type="button"
          onClick={() => setCallsOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground shadow-sm hover:border-primary/40 hover:text-primary"
        >
          <ReceiptText size={14} />
          LLM calls
        </button>
      </div>

      {run.summary && <p className="max-h-28 overflow-hidden border-l-2 border-border pl-3 text-[13px] leading-relaxed text-muted-foreground" title={run.summary}>{run.summary}</p>}

      {run.status !== "terminal" && <button className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive hover:bg-destructive/20" onClick={onCancel}><Ban size={14} /> Cancel run</button>}
      {callsOpen && <CallsDrawer runId={run.id} onClose={() => setCallsOpen(false)} />}
    </aside>
  );
}

function CopyJobUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API needs a focused document and a secure context; the dev
      // server over plain http:// qualifies via localhost, but older fallback
      // paths are not worth the code here — surface failure as a no-op.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      title={copied ? "Copied" : "Copy job URL"}
      aria-label={copied ? "Copied job URL" : "Copy job URL"}
      onClick={copy}
      className="text-muted-foreground transition-colors hover:text-primary"
    >
      {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  );
}

function SubmissionSuccess({ run }: { run: Run }) {
  // Bootstrap once; live updates arrive via artifact.created events through
  // the sync store.
  const artifactsQuery = useQuery({
    queryKey: ["run-artifacts", run.id],
    queryFn: () => api.artifacts(run.id),
    enabled: run.outcome === "submitted_verified",
    staleTime: Infinity,
  });
  useEffect(() => {
    if (artifactsQuery.data) useSyncStore.getState().seedArtifacts(run.id, artifactsQuery.data);
  }, [run.id, artifactsQuery.data]);
  const artifacts = useArtifacts(run.id);
  const confirmation = byKind(artifacts, "submission_confirmation");
  const review = byKind(artifacts, "review_screenshot");
  return (
    <div className="overflow-hidden rounded-xl border border-success/30 bg-success/10 shadow-sm">
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <CheckCircle2 className="text-success" size={18} />
        <span className="text-sm font-semibold text-success">Application submitted</span>
        <span className="ml-auto rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">✓ verified</span>
      </div>
      {durationLabel(run) && (
        <p className="flex items-center gap-1.5 px-3.5 pb-2 font-mono text-[12.5px] leading-5 tabular-nums text-success">
          <Timer size={12} /> took {durationLabel(run)}
        </p>
      )}
      {confirmation && (
        <a
          href={`/api/v1/artifacts/${confirmation.artifact_id}`}
          target="_blank"
          rel="noreferrer"
          className="block border-y border-success/20 bg-card p-2"
        >
          <img
            src={`/api/v1/artifacts/${confirmation.artifact_id}`}
            alt="Submission confirmation screenshot"
            className="mx-auto max-h-72 w-auto rounded-lg object-contain"
          />
        </a>
      )}
      {run.summary && (
        <p className="px-3.5 pt-2 pb-3 text-[13px] leading-relaxed text-success/80">{run.summary}</p>
      )}
      {review && (
        <details className="border-t border-success/20 px-3.5 py-2">
          <summary className="cursor-pointer text-[11px] font-medium text-success">Pre-submit review screenshot</summary>
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

function byKind(artifacts: ReturnType<typeof useArtifacts>, kind: string): Artifact | undefined {
  return artifacts?.find((artifact) => artifact.kind === kind);
}

function RunStats({ runId, active }: { runId: string; active: boolean }) {
  // Ledger rows persist server-side per call; a slow poll while the run is
  // active keeps totals fresh without hammering the backend. The calls
  // drawer tightens this to 4s while open (shared query key).
  const { data } = useQuery({
    queryKey: ["calls", runId],
    queryFn: () => api.calls(runId),
    refetchInterval: active ? 15_000 : false,
  });
  const totals = data?.totals;
  const calls = data?.calls ?? [];
  if (!totals || totals.calls === 0) return null;
  const cacheRate = totals.input_tokens > 0 ? totals.cache_read_tokens / totals.input_tokens : 0;
  const cell = "rounded-lg border border-border bg-card px-2 py-1.5";
  const value = "block font-mono text-[12.5px] leading-5 tabular-nums font-semibold text-foreground";
  const label = "block text-[10px] text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">Run stats</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className={cell}><span className={value}>{totals.calls}</span><span className={label}>calls</span></div>
        <div className={cell}><span className={value}>{fmtCompact(totals.new_input_tokens)}</span><span className={label}>in tokens</span></div>
        <div className={cell}><span className={value}>{fmtCompact(totals.output_tokens)}</span><span className={label}>out</span></div>
        <div className={cell}><span className={value}>{cacheRate > 0 ? `${(cacheRate * 100).toFixed(0)}%` : "—"}</span><span className={label}>cache</span></div>
        <div className={cell}><span className={value}>${totals.cost_usd.toFixed(3)}</span><span className={label}>cost</span></div>
        <div className={cell}><span className={value}>{calls[0] ? calls[0].model.split("-")[0] : "—"}</span><span className={label}>model</span></div>
      </div>
    </div>
  );
}

function fmtCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}
