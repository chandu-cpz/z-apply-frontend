import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";
import { mergeLive, turnBoundaries, EMPTY_LIVELY } from "@/lib/live";
import { buildTimeline } from "@/lib/timeline/build";
import type { LiveAgent } from "@/lib/live";
import type { ActivityEvent, Run } from "@/types";
import { useLiveStore } from "@/live-store";
import { LiveAssistant, TurnMessage } from "./message-assistant";
import { ToolMessage } from "./message-tool";
import { ActivityGroup, HumanHandoffCard, ModelClusterRowCard, RecoveryRow, RunLabel, SectionDivider, StallRow, SubmissionApprovalCard, SystemRow } from "./message-row";import { flattenTimeline, groupRows, isQuiet, rowKey, type ChatRow } from "./rows";

const FOLLOW_THRESHOLD_PX = 80;

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Application";
  }
}

/** Telemetry as pills, not events: only what a human would care about.
 * No run lifecycle, no model selection (the message header shows the model),
 * no page/phase events. Just: authenticated, interruptions, checkpoints,
 * warnings. */
function ActivityStrip({ activity }: { activity: ChatRow[] }) {
  const pills = useMemo(() => {
    let interruptions = 0;
    let checkpoints = 0;
    let notices = 0;
    let authenticated = false;
    for (const row of activity) {
      if (row.kind === "model-cluster") continue;
      if (row.kind !== "row") continue;
      const item = row.item;
      if (item.kind === "recovery") interruptions += 1;
      else if (item.kind === "human") checkpoints += 1;
      else if (item.kind === "notice") notices += 1;
      else if (item.kind === "auth" && item.status === "completed") authenticated = true;
    }
    const list: Array<{ label: string; cls: string }> = [];
    if (authenticated) {
      list.push({ label: "authenticated", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" });
    }
    if (interruptions > 0) {
      list.push({ label: `${interruptions} interruption${interruptions > 1 ? "s" : ""}`, cls: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" });
    }
    if (checkpoints > 0) {
      list.push({ label: `${checkpoints} checkpoint${checkpoints > 1 ? "s" : ""} answered`, cls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" });
    }
    if (notices > 0) {
      list.push({ label: `${notices} warning${notices > 1 ? "s" : ""}`, cls: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" });
    }
    return list;
  }, [activity]);
  if (pills.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5">
      {pills.map((pill) => (
        <span key={pill.label} className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-medium", pill.cls)}>
          {pill.label}
        </span>
      ))}
    </div>
  );
}

function RunHeader({ run }: { run: Run }) {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  const running = run.status === "running" || run.status === "starting";
  const waiting = run.status === "waiting_human" || run.status === "human_control";
  const chip = submitted
    ? { label: "submitted", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" }
    : failed
      ? { label: "failed", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300" }
      : waiting
        ? { label: "needs you", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" }
        : running
          ? { label: "running", cls: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300" }
          : { label: "finished", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" };
  const started = new Date(run.started_at || run.created_at);
  const ended = run.finished_at ? new Date(run.finished_at) : new Date();
  const seconds = Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 1000));
  const duration = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  return (
    <div className="mb-6 border-b border-zinc-100 pb-5 dark:border-zinc-800/60">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
          <BriefcaseBusiness size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{run.company || hostname(run.job_url)}</p>
          <p className="truncate text-[11.5px] text-zinc-400 dark:text-zinc-500">{run.role || "Role details loading"}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium", chip.cls)}>{chip.label}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
          {run.finished_at ? duration : `${duration} · in progress`}
        </span>
      </div>
      {run.summary && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">{run.summary}</p>
      )}
    </div>
  );
}

export function RowRenderer({ row, onAnswer, onDecide }: { row: ChatRow; onAnswer?: (requestId: string, answer: string) => void; onDecide?: (requestId: string, decision: "approve" | "reject") => void }) {  switch (row.kind) {
    case "assistant-live":
      return <LiveAssistant agent={row.agent} />;
    case "turn":
      return <TurnMessage item={row.item} />;
    case "tool":
      return <ToolMessage item={row.item} />;
    case "section":
      return <SectionDivider agent={row.agent} status={row.status} occurredAt={row.occurredAt} parent={row.parent} />;
    case "run-label":
      return <RunLabel label={row.label} startedAt={row.startedAt} status={row.status} />;
    case "recovery":
      return <RecoveryRow attempt={row.item.attempt} errorType={row.item.errorType} detail={row.item.detail} stage={row.item.stage} />;
    case "model-cluster":
      return <ModelClusterRowCard item={row.item} />;
    case "row":
      if (row.item.kind === "human" && (row.item.sub === "handoff" || row.item.sub === "requested" || row.item.sub === "cancelled")) {
        return <HumanHandoffCard item={row.item} onAnswer={onAnswer} />;
      }
      if (row.item.kind === "stall") {
        return <StallRow item={row.item} />;
      }
      if (row.item.kind === "submission" && ["approval_requested", "approved", "rejected"].includes(row.item.sub)) {
        return <SubmissionApprovalCard item={row.item} onDecide={onDecide} />;
      }
      return <SystemRow item={row.item} compact={isQuiet(row)} />;
    case "activity-group":
      return <ActivityGroup group={row} />;
  }
}

function EmptyState() {
  return (
    <div className="grid place-items-center px-6 py-24 text-center">
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        Live reasoning, tool calls and agent activity will stream here.
      </p>
    </div>
  );
}

export function MessageList({ runId, events, run, onAnswer, onDecide }: { runId: string; events: ActivityEvent[]; run: Run; onAnswer?: (requestId: string, answer: string) => void; onDecide?: (requestId: string, decision: "approve" | "reject") => void }) {
  const boundaries = useMemo(() => turnBoundaries(events), [events]);
  const live = useLiveStore((state) => state.byRun[runId] ?? EMPTY_LIVELY);
  const liveAgents = useMemo<LiveAgent[]>(() => mergeLive(live, boundaries), [live, boundaries]);
  // Thread = pure conversation; every system/telemetry row is pulled out into
  // a single "Activity" disclosure rendered under the run header. This is the
  // Claude/ChatGPT separation of conversation from activity: queued/started/
  // phase/model/auth/browser/recovery events never pollute the thread.
  const { rows, activity } = useMemo(() => {
    const flat: ChatRow[] = [];
    flattenTimeline(buildTimeline(events), flat);
    for (const agent of liveAgents) flat.push({ kind: "assistant-live", agent });
    const conversation: ChatRow[] = [];
    const system: ChatRow[] = [];
    for (const row of flat) {
      if (isQuiet(row)) system.push(row);
      else conversation.push(row);
    }
    return { rows: groupRows(conversation), activity: system };
  }, [liveAgents, events]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const followDown = useRef(true);
  const [jumpVisible, setJumpVisible] = useState(false);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - FOLLOW_THRESHOLD_PX;
    followDown.current = atBottom;
    setJumpVisible(!atBottom);
  };

  useEffect(() => {
    if (!followDown.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length, liveAgents.length, run.latest_run_sequence]);

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-background">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="log" aria-live="polite">
        <div className="mx-auto w-full max-w-[700px] px-5 py-7">
          <RunHeader run={run} />
          <ActivityStrip activity={activity} />
          {rows.length === 0 && <EmptyState />}
          {rows.map((row) => (
            <div key={rowKey(row)}>
              <RowRenderer row={row} onAnswer={onAnswer} onDecide={onDecide} />
            </div>
          ))}
        </div>
      </div>
      {jumpVisible && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-lg hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <ArrowDown size={14} />
          Jump to latest
        </button>
      )}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent")} />
    </section>
  );
}
