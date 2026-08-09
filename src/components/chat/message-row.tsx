import { useState } from "react";
import { Bot, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtTime, humanAgent } from "@/lib/format";
import type { ModelClusterItem, ModelEntry, TimelineItem } from "@/lib/timeline/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ChatRow } from "./rows";

function Meta({ occurredAt }: { occurredAt: string }) {
  return (
    <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">{fmtTime(occurredAt)}</time>
  );
}

const AGENT_TONES: Record<string, { avatar: string; icon: string; pill: string; label: string }> = {
  running: { avatar: "bg-violet-100 dark:bg-violet-950/60", icon: "text-violet-600 dark:text-violet-300", pill: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300", label: "Running" },
  completed: { avatar: "bg-emerald-100 dark:bg-emerald-950/60", icon: "text-emerald-600 dark:text-emerald-300", pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", label: "Completed" },
  failed: { avatar: "bg-rose-100 dark:bg-rose-950/60", icon: "text-rose-600 dark:text-rose-300", pill: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300", label: "Failed" },
};

export function SectionDivider({ agent, status, occurredAt, parent }: { agent: string; status: string; occurredAt: string; parent?: string }) {
  const tone = AGENT_TONES[status] ?? AGENT_TONES.completed;
  return (
    <div className="mb-4 mt-7 flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-3.5 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone.avatar)}>
        <Bot size={17} className={tone.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{humanAgent(agent)}</p>
        {parent && <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">subagent of {humanAgent(parent)}</p>}
      </div>
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", tone.pill)}>{tone.label}</span>
      <Meta occurredAt={occurredAt} />
    </div>
  );
}

export function RunLabel({ label, startedAt, status }: { label: string; startedAt: string; status: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 px-0.5">
      <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-zinc-400 uppercase dark:text-zinc-500">{label}</span>
      <span className="text-xs text-zinc-400 dark:text-zinc-500">{fmtTime(startedAt)}</span>
      <span className={cn("ml-auto text-xs", status === "failed" ? "text-rose-400" : status === "running" ? "text-violet-500" : "text-emerald-500")}>{status}</span>
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

export function RecoveryRow({ attempt, errorType, detail, stage, occurredAt }: { attempt: number; errorType: string; detail: string; stage: string; occurredAt: string }) {
  const [open, setOpen] = useState(false);
  const collapsible = detail.length > 60;
  const title = RECOVERY_TITLES[stage] ?? stage.replaceAll("_", " ");
  const reason = detail || (errorType ? errorType.replaceAll("_", " ") : "");
  const attemptLabel = attempt > 0 ? `attempt ${attempt}` : "";
  return (
    <div className="mb-3 rounded-xl border border-amber-200/70 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/15">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left", collapsible ? "hover:bg-amber-100/40 dark:hover:bg-amber-950/30" : "cursor-default")}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
              <RotateCcw size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-amber-900 dark:text-amber-100">{title}</span>
              {reason && (
                <span className="mt-0.5 block truncate text-[13px] text-amber-700/80 dark:text-amber-200/70">
                  {reason}
                  {attemptLabel && <span className="ml-1.5 text-amber-500/80 dark:text-amber-300/60">({attemptLabel})</span>}
                </span>
              )}
            </span>
            {collapsible && <ChevronRight size={13} className={cn("shrink-0 text-amber-400 transition-transform", open && "rotate-90")} />}
            <Meta occurredAt={occurredAt} />
          </button>
        </CollapsibleTrigger>
        {collapsible && (
          <CollapsibleContent>
            <pre className="mx-3.5 mb-3 max-h-72 overflow-auto rounded-lg border border-amber-200/60 bg-white/60 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-amber-900 dark:border-amber-900/40 dark:bg-zinc-950/40 dark:text-amber-200">
              {detail}
            </pre>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function ActivityGroup({ group }: { group: Extract<ChatRow, { kind: "activity-group" }> }) {
  const [open, setOpen] = useState(false);
  const count = group.children.length;
  return (
    <div className="mb-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
            aria-expanded={open}
          >
            <ChevronRight size={12} className={cn("shrink-0 text-zinc-400 transition-transform", open && "rotate-90")} />
            <span className="size-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Activity</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{count} events</span>
            <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
              {fmtTime(lastOccurredAt(group.children))}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 space-y-1 border-l border-zinc-100 pl-3 dark:border-zinc-800">
            {group.children.map((child, index) => (
              <div key={index} className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                <SystemRow item={(child as Extract<ChatRow, { kind: "row" }>).item} compact />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function lastOccurredAt(rows: ChatRow[]): string {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row.kind === "row") {
      const item = row.item;
      const occurredAt = "item" in item ? item.item.occurredAt : item.occurredAt;
      if (occurredAt) return occurredAt;
    }
    if (row.kind === "model-cluster") return row.item.occurredAt;
  }
  return "";
}

const MODEL_SUB_TONES: Record<string, string> = {
  selected: "text-violet-600 dark:text-violet-300",
  failed: "text-rose-500",
  rotated: "text-blue-500",
  retrying: "text-amber-600",
  rate_limited: "text-amber-600",
};

function ModelClusterRow({ entry }: { entry: ModelEntry }) {
  return (
    <div className="border-t border-zinc-100 px-3.5 py-2.5 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", MODEL_SUB_TONES[entry.sub] ?? "text-zinc-500")}>{entry.sub.replaceAll("_", " ")}</span>
        <span className="min-w-0 truncate text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{humanAgent(entry.agent)}</span>
        <span className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{entry.model}</span>
        <Meta occurredAt={entry.occurredAt} />
      </div>
      {entry.detail && (
        <p className={cn("mt-1 text-[13px] leading-relaxed", entry.sub === "failed" ? "font-mono text-rose-600 dark:text-rose-300" : "truncate font-mono text-zinc-400 dark:text-zinc-600")}>{entry.detail}</p>
      )}
    </div>
  );
}

export function ModelClusterRowCard({ item }: { item: ModelClusterItem }) {
  const [open, setOpen] = useState(false);
  const unsettled = item.failed + item.retrying + item.rateLimited;
  return (
    <div className="mb-3 rounded-xl border border-zinc-200/80 bg-card shadow-sm dark:border-zinc-800">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <ChevronRight size={12} className={cn("shrink-0 text-zinc-400 transition-transform", open && "rotate-90")} />
        <span className={cn("text-[13px] font-semibold", unsettled > 0 ? "text-amber-600" : "text-zinc-800 dark:text-zinc-200")}>Model routing</span>
        {item.failed > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">{item.failed} failed</span>}
        {item.rotated > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">{item.rotated} rotated</span>}
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">{item.entries.length} events</span>
        <Meta occurredAt={item.occurredAt} />
      </button>
      {open && item.entries.map((entry) => <ModelClusterRow key={entry.seq} entry={entry} />)}
    </div>
  );
}

export function SystemRow({ item, compact = false }: { item: TimelineItem; compact?: boolean }) {
  const label = systemLabel(item);
  const tone = systemTone(item);
  const detail = systemDetail(item);
  const occurredAt = "item" in item ? item.item.occurredAt : item.occurredAt;
  if (compact) {
    return (
      <div className="flex items-baseline gap-2 py-0.5">
        <span className={cn("min-w-0 flex-1 truncate", tone)}>{label}</span>
        {detail && <span className="min-w-0 flex-1 truncate text-zinc-400 dark:text-zinc-500">{detail}</span>}
      </div>
    );
  }
  return (
    <div className="mb-1.5 flex items-baseline gap-2.5 px-0.5 py-0.5">
      <span className="size-1.5 translate-y-[-1px] shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", tone)}>{label}</span>
      {detail && <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-400 dark:text-zinc-500">{detail}</span>}
      <Meta occurredAt={occurredAt} />
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
      return item.status === "failed" ? "text-rose-500" : item.status === "completed" ? "text-emerald-600" : "text-zinc-700 dark:text-zinc-300";
    case "human":
      return item.sub === "requested" ? "text-amber-700 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-300";
    case "submission":
      return item.sub === "approved" || item.sub === "verified" ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-700 dark:text-zinc-300";
    case "run":
      return item.sub === "Interrupted" || item.sub === "Start failed" ? "text-rose-500" : "text-zinc-700 dark:text-zinc-300";
    default:
      return "text-zinc-700 dark:text-zinc-300";
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
