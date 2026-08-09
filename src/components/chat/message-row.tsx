import { useState } from "react";
import { ChevronRight, HelpCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtTime, humanAgent } from "@/lib/format";
import type { ModelClusterItem, ModelEntry, TimelineItem } from "@/lib/timeline/types";
import type { ChatRow } from "./rows";

const metaClass = "shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500";

function Meta({ occurredAt }: { occurredAt: string }) {
  return <time className={metaClass}>{fmtTime(occurredAt)}</time>;
}

/** Agent switch: a hairline rule plus a quiet header — Claude-style separator. */
export function SectionDivider({ agent, status, occurredAt, parent }: { agent: string; status: string; occurredAt: string; parent?: string }) {
  const tone =
    status === "failed" ? "text-rose-500" : status === "running" ? "text-violet-500" : "text-emerald-500";
  return (
    <div className="mt-7 mb-3 flex items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/60">
      <span className={cn("size-1.5 shrink-0 rounded-full", tone)} />
      <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{humanAgent(agent)}</span>
      {parent && <span className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">· subagent of {humanAgent(parent)}</span>}
      <Meta occurredAt={occurredAt} />
    </div>
  );
}

/** Run grouping: one whisper line. */
export function RunLabel({ label, startedAt, status }: { label: string; startedAt: string; status: string }) {
  return (
    <div className="mt-5 mb-1 flex items-center gap-2 px-0.5">
      <span className="text-[11px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500">{label}</span>
      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{fmtTime(startedAt)}</span>
      <span className={cn("ml-auto text-[11px]", status === "failed" ? "text-rose-400" : status === "running" ? "text-violet-500" : "text-emerald-500")}>{status}</span>
    </div>
  );
}

const RECOVERY_TITLES: Record<string, string> = {
  started: "Recovering from a stalled action",
  completed: "Recovered after an interruption",
  exhausted: "Recovery exhausted — run ended",
  progress_reset: "Progress reset",
  failed: "Recovery failed",
};

/** Recovery: one quiet amber line, expands to the reason. */
export function RecoveryRow({ attempt, errorType, detail, stage }: { attempt: number; errorType: string; detail: string; stage: string }) {
  const [open, setOpen] = useState(false);
  const collapsible = detail.length > 60;
  const title = RECOVERY_TITLES[stage] ?? stage.replaceAll("_", " ");
  const reason = detail || (errorType ? errorType.replaceAll("_", " ") : "");
  const attemptLabel = attempt > 0 ? `attempt ${attempt}` : "";
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => collapsible && setOpen((value) => !value)}
        disabled={!collapsible}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors",
          collapsible ? "hover:bg-amber-50 dark:hover:bg-amber-950/20" : "cursor-default",
        )}
        aria-expanded={open}
      >
        <RotateCcw size={12} className="shrink-0 text-amber-400" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-amber-700 dark:text-amber-300">
          {title}
          {reason && <span className="ml-1.5 text-amber-500/80 dark:text-amber-200/60">· {reason}</span>}
          {attemptLabel && <span className="ml-1 text-[11px] text-amber-400/80 dark:text-amber-300/50">({attemptLabel})</span>}
        </span>
        {collapsible && <ChevronRight size={11} className={cn("shrink-0 text-amber-300 transition-transform", open && "rotate-90")} />}
      </button>
      {open && (
        <pre className="mt-1 ml-6 max-h-64 overflow-auto rounded-lg bg-amber-50/70 px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          {detail}
        </pre>
      )}
    </div>
  );
}

/** Collapsed system activity: one hairline expandable row with a smart label. */
const ACTIVITY_KIND_LABELS: Record<string, string> = {
  run: "Run",
  browser: "Browser",
  model: "Model",
  agent: "Agents",
  auth: "Authentication",
  submission: "Submission",
  artifact: "Artifact",
  notice: "Notice",
  context: "Context",
};

function activityLabel(children: ChatRow[]): string {
  const kinds = new Set<string>();
  for (const child of children) {
    if (child.kind === "model-cluster") kinds.add("model");
    else if (child.kind === "row") kinds.add(child.item.kind);
  }
  const names = [...kinds].map((kind) => ACTIVITY_KIND_LABELS[kind] ?? kind);
  if (names.length === 0) return "Activity";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} · ${names[1]}`;
  return `${names[0]} · ${names[1]} · +${names.length - 2}`;
}

export function ActivityGroup({ group }: { group: Extract<ChatRow, { kind: "activity-group" }> }) {
  const [open, setOpen] = useState(false);
  const count = group.children.length;
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
        aria-expanded={open}
      >
        <ChevronRight size={11} className={cn("shrink-0 text-zinc-300 transition-transform dark:text-zinc-600", open && "rotate-90")} />
        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{activityLabel(group.children)}</span>
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{count}</span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-zinc-100 pl-3 dark:border-zinc-800">
          {group.children.map((child, index) => (
            <SystemRow key={index} item={(child as Extract<ChatRow, { kind: "row" }>).item} compact />
          ))}
        </div>
      )}
    </div>
  );
}

/** Model activity: one whisper line ("Model deepseek-v4-flash"), no card. */
export function ModelClusterRowCard({ item }: { item: ModelClusterItem }) {
  const [open, setOpen] = useState(false);
  const unsettled = item.failed + item.retrying + item.rateLimited;
  const label = item.lastModel ? `Model ${humanAgent(item.lastModel)}` : "Model selection";
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
        aria-expanded={open}
      >
        <ChevronRight size={11} className={cn("shrink-0 text-zinc-300 transition-transform dark:text-zinc-600", open && "rotate-90")} />
        <span className={cn("text-[12px]", unsettled > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400")}>{label}</span>
        {unsettled > 0 && <span className="text-[11px] text-amber-500">({item.failed} failed{item.rotated ? `, ${item.rotated} rotated` : ""})</span>}
        {item.entries.length > 1 && <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{item.entries.length} events</span>}
      </button>
      {open && item.entries.map((entry) => <ModelLine key={entry.seq} entry={entry} />)}
    </div>
  );
}

function ModelLine({ entry }: { entry: ModelEntry }) {
  const tone = entry.sub === "failed" ? "text-rose-500" : entry.sub === "rotated" ? "text-blue-500" : entry.sub === "retrying" || entry.sub === "rate_limited" ? "text-amber-500" : "text-zinc-500 dark:text-zinc-400";
  return (
    <div className="ml-5 flex items-baseline gap-2 py-0.5">
      <span className={cn("text-[11.5px]", tone)}>{entry.sub.replaceAll("_", " ")}</span>
      <span className="truncate text-[11.5px] text-zinc-600 dark:text-zinc-300">{humanAgent(entry.agent)}</span>
      <span className="truncate font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{entry.model}</span>
    </div>
  );
}

/** HITL handoff: quiet amber card (no border), question + answer. */
export function HumanHandoffCard({ item }: { item: Extract<TimelineItem, { kind: "human" }> }) {
  return (
    <div className="mb-2 rounded-xl bg-amber-50/80 px-3.5 py-2.5 dark:bg-amber-950/15">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
          <HelpCircle size={12} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-amber-900 dark:text-amber-100">{item.question || "You were asked"}</p>
          {item.answer ? (
            <p className="mt-0.5 text-[12.5px] text-amber-800/90 dark:text-amber-200/90">
              Your answer: <span className="font-medium">{item.answer}</span>
            </p>
          ) : (
            <p className="mt-0.5 text-[12.5px] text-amber-700/80 dark:text-amber-200/70">Waiting for your answer…</p>
          )}
        </div>
        <time className="shrink-0 text-[11px] tabular-nums text-amber-500/80 dark:text-amber-300/60" title={item.resolvedAt ? "resolved" : "requested"}>
          {fmtTime(item.resolvedAt || item.occurredAt)}
        </time>
      </div>
    </div>
  );
}

/** System events (run/browser/artifact/auth/context/notice): one whisper line. */
export function SystemRow({ item, compact = false }: { item: TimelineItem; compact?: boolean }) {
  const label = systemLabel(item);
  const tone = systemTone(item);
  const detail = systemDetail(item);
  if (compact) {
    return (
      <div className="flex items-baseline gap-2 py-0.5">
        <span className={cn("min-w-0 flex-1 truncate text-[12px]", tone)}>{label}</span>
        {detail && <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-400 dark:text-zinc-500">{detail}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-0.5 py-0.5">
      <span className={cn("size-1 shrink-0 rounded-full", item.kind === "notice" && item.level === "error" ? "bg-rose-400" : "bg-zinc-300 dark:bg-zinc-600")} />
      <span className={cn("min-w-0 flex-1 truncate text-[12px]", tone)}>{label}</span>
      {detail && <span className="min-w-0 max-w-[40%] truncate text-[12px] text-zinc-400 dark:text-zinc-500">{detail}</span>}
    </div>
  );
}

function systemLabel(item: TimelineItem): string {
  switch (item.kind) {
    case "agent":
      return `${humanAgent(item.agent)} · ${item.status}`;
    case "model":
      return `Model ${item.sub.replaceAll("_", " ")}`;
    case "browser":
      return item.sub;
    case "human":
      return `Human ${item.sub.replaceAll("_", " ")}`;
    case "submission":
      return `Submission ${item.sub.replaceAll("_", " ")}`;
    case "artifact":
      return `Artifact · ${item.filename}`;
    case "run":
      return `Run ${item.sub.charAt(0).toLowerCase()}${item.sub.slice(1)}`;
    case "auth":
      return "Authentication";
    case "context":
      return `Steering context (${item.source})`;
    case "notice":
      return item.level;
    default:
      return item.kind;
  }
}

function systemTone(item: TimelineItem): string {
  switch (item.kind) {
    case "notice":
      return item.level === "error" ? "text-rose-600 dark:text-rose-300" : "text-amber-600 dark:text-amber-300";
    case "auth":
      return item.status === "failed" ? "text-rose-500" : item.status === "completed" ? "text-emerald-600" : "text-zinc-600 dark:text-zinc-300";
    case "human":
      return item.sub === "requested" ? "text-amber-700 dark:text-amber-300" : "text-zinc-600 dark:text-zinc-300";
    case "submission":
      return item.sub === "approved" || item.sub === "verified" ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-600 dark:text-zinc-300";
    case "run":
      return item.sub === "Interrupted" || item.sub === "Start failed" ? "text-rose-500" : "text-zinc-600 dark:text-zinc-300";
    default:
      return "text-zinc-600 dark:text-zinc-300";
  }
}

function systemDetail(item: TimelineItem): string {
  switch (item.kind) {
    case "model":
      return String(item.model);
    case "auth":
      return (item.summary || item.status).slice(0, 220);
    case "context":
      return item.content;
    case "notice":
      return item.message;
    case "agent":
      return item.status === "failed" ? item.detail : "";
    default:
      return "";
  }
}
