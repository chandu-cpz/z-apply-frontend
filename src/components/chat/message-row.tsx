import { useState } from "react";
import { ChevronRight, HelpCircle, RotateCcw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtTime, humanAgent, humanModel } from "@/lib/format";
import type { ModelClusterItem, ModelEntry, TimelineItem } from "@/lib/timeline/types";
import type { ChatRow } from "./rows";

const metaClass = "shrink-0 text-[11px] tabular-nums text-muted-foreground";

function Meta({ occurredAt }: { occurredAt: string }) {
  return <time className={metaClass}>{fmtTime(occurredAt)}</time>;
}

/** Agent switch: a hairline rule plus a quiet header — Claude-style separator. */
export function SectionDivider({ agent, status, occurredAt, parent }: { agent: string; status: string; occurredAt: string; parent?: string }) {
  const tone =
    status === "failed" ? "text-destructive" : status === "running" ? "text-primary" : "text-success";
  return (
    <div className="mt-7 mb-3 flex items-center gap-3 border-t border-border pt-3">
      <span className={cn("size-1.5 shrink-0 rounded-full", tone)} />
      <span className="text-[13px] font-medium text-foreground">{humanAgent(agent)}</span>
      {parent && <span className="truncate text-[11px] text-muted-foreground">· subagent of {humanAgent(parent)}</span>}
      <Meta occurredAt={occurredAt} />
    </div>
  );
}

/** Run grouping: one whisper line. */
export function RunLabel({ label, startedAt, status }: { label: string; startedAt: string; status: string }) {
  return (
    <div className="mt-5 mb-1 flex items-center gap-2 px-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground">{fmtTime(startedAt)}</span>
      <span className={cn("ml-auto text-[11px]", status === "failed" ? "text-destructive" : status === "running" ? "text-primary" : "text-success")}>{status}</span>
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
  const working = stage === "started" || stage === "progress_reset";
  return (
    <div className="mb-1.5">
      <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1">
        <RotateCcw size={12} className={cn("shrink-0 text-warning", working && "animate-spin")} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-warning">
          {title}
          {reason && <span className="ml-1.5 text-warning/70">· {reason}</span>}
          {attemptLabel && <span className="ml-1 text-[11px] text-warning/70">({attemptLabel})</span>}
        </span>
        {working && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-warning">
            <span className="size-1 animate-pulse rounded-full bg-warning" />
            working…
          </span>
        )}
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 rounded p-0.5 hover:bg-warning/10"
            aria-expanded={open}
          >
            <ChevronRight size={11} className={cn("text-warning/70 transition-transform", open && "rotate-90")} />
          </button>
        )}
      </div>
      {open && (
        <pre className="mt-1 ml-6 max-h-64 overflow-auto rounded-lg bg-warning/10 px-3 py-2 font-mono text-[12.5px] leading-5 tabular-nums whitespace-pre-wrap text-warning">
          {detail}
        </pre>
      )}
    </div>
  );
}

/** Collapsed system activity: one hairline row with a human summary and the
 * time span it covers — e.g. "2 interruptions · Model deepseek-v4-flash · 21:28–21:44". */
function rowOccurredAt(row: ChatRow): string {
  switch (row.kind) {
    case "row":
      return "item" in row.item ? row.item.item.occurredAt : row.item.occurredAt;
    case "model-cluster":
      return row.item.occurredAt;
    default:
      return "";
  }
}

function activitySummary(children: ChatRow[]): string {
  let interruptions = 0;
  let humanCount = 0;
  let runEvents = 0;
  let browserEvents = 0;
  let modelLabel = "";
  let authEvents = 0;
  let noticeEvents = 0;
  for (const child of children) {
    if (child.kind === "model-cluster") {
      modelLabel = humanModel(child.item.lastModel) || modelLabel;
      continue;
    }
    if (child.kind !== "row") continue;
    const item = child.item;
    switch (item.kind) {
      case "recovery":
        interruptions += 1;
        break;
      case "human":
        humanCount += 1;
        break;
      case "run":
        runEvents += 1;
        break;
      case "browser":
        browserEvents += 1;
        break;
      case "model":
        if (item.model) modelLabel = item.model;
        break;
      case "auth":
        authEvents += 1;
        break;
      case "notice":
        noticeEvents += 1;
        break;
      default:
        break;
    }
  }
  const parts: string[] = [];
  if (interruptions > 0) parts.push(`${interruptions} interruption${interruptions > 1 ? "s" : ""}`);
  if (modelLabel) parts.push(`Model ${humanModel(modelLabel)}`);
  if (humanCount > 0) parts.push(`${humanCount} checkpoint${humanCount > 1 ? "s" : ""}`);
  if (runEvents > 0) parts.push("run");
  if (browserEvents > 0) parts.push("browser");
  if (authEvents > 0) parts.push("auth");
  if (noticeEvents > 0) parts.push("notice");
  if (parts.length === 0) return "Activity";
  return parts.slice(0, 3).join(" · ");
}

export function ActivityGroup({ group }: { group: Extract<ChatRow, { kind: "activity-group" }> }) {
  const [open, setOpen] = useState(false);
  const count = group.children.length;
  const firstAt = rowOccurredAt(group.children[0]);
  const lastAt = rowOccurredAt(group.children[group.children.length - 1]);
  const span =
    firstAt && lastAt && firstAt !== lastAt
      ? `${fmtTime(firstAt)} – ${fmtTime(lastAt)}`
      : firstAt
        ? fmtTime(firstAt)
        : "";
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-muted"
        aria-expanded={open}
      >
        <ChevronRight size={11} className={cn("shrink-0 text-muted-foreground/70 transition-transform", open && "rotate-90")} />
        <span className="truncate text-[12px] text-muted-foreground">{activitySummary(group.children)}</span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{count}</span>
        <span className="ml-auto shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{span}</span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-border pl-3">
          {group.children.map((child, index) => (
            <SystemRow key={index} item={(child as Extract<ChatRow, { kind: "row" }>).item} compact />
          ))}
        </div>
      )}
    </div>
  );
}

/** Model activity: one whisper line per event — just the model name (+ failures),
 * the model is already shown in the message header, so no "selected" verb spam. */
export function ModelClusterRowCard({ item }: { item: ModelClusterItem }) {
  const [open, setOpen] = useState(false);
  const unsettled = item.failed + item.rateLimited;
  const label = item.lastModel ? `Model ${humanModel(item.lastModel)}` : "Model";
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-muted"
        aria-expanded={open}
      >
        <ChevronRight size={11} className={cn("shrink-0 text-muted-foreground/70 transition-transform", open && "rotate-90")} />
        <span className={cn("truncate text-[12px]", unsettled > 0 ? "text-warning" : "text-muted-foreground")}>{label}</span>
        {unsettled > 0 && <span className="shrink-0 text-[11px] text-warning">({item.failed} failed{item.rotated ? `, ${item.rotated} rotated` : ""})</span>}
        {item.entries.length > 1 && <span className="shrink-0 text-[11px] text-muted-foreground">{item.entries.length} switches</span>}
        <span className="ml-auto shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{fmtTime(item.occurredAt)}</span>
      </button>
      {open && item.entries.map((entry) => <ModelLine key={entry.seq} entry={entry} />)}
    </div>
  );
}

function ModelLine({ entry }: { entry: ModelEntry }) {
  const unsettled = entry.sub === "failed" || entry.sub === "rate_limited";
  const tone = unsettled ? "text-warning" : "text-muted-foreground";
  return (
    <div className="ml-5 flex items-baseline gap-2 py-0.5">
      <span className={cn("truncate font-mono text-[12.5px] leading-5 tabular-nums", tone)}>{entry.model}</span>
      {entry.agent && entry.agent !== "orchestrator" && (
        <span className="truncate text-[11px] text-muted-foreground">{humanAgent(entry.agent)}</span>
      )}
      {unsettled && <span className="shrink-0 text-[10.5px] text-warning">{entry.sub.replaceAll("_", " ")}</span>}
      <time className="ml-auto shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{fmtTime(entry.occurredAt)}</time>
    </div>
  );
}

/** HITL checkpoint, fully interactive in the web UI:
 * - answered: a conversational exchange (assistant asks, user bubble answers)
 * - pending: MCQ options render as clickable buttons, free-text as an inline
 *   input — both answer through the API via onAnswer(request_id, value). */
export function HumanHandoffCard({ item, onAnswer }: { item: Extract<TimelineItem, { kind: "human" }>; onAnswer?: (requestId: string, answer: string) => void }) {
  const question = item.question || item.detail || "The agent needs your input";
  const answer = item.answer;
  const cancelled = item.sub === "cancelled";
  const options = item.options?.length ? item.options : [];
  const requestId = item.request_id;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const answerable = Boolean(requestId && onAnswer && !answer && !cancelled);

  const submit = (value: string) => {
    if (!requestId || !onAnswer || !value.trim() || sending) return;
    setSending(true);
    onAnswer(requestId, value.trim());
  };

  return (
    <div className="mb-4">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg",
            cancelled
              ? "bg-muted text-muted-foreground"
              : "bg-warning/15 text-warning",
          )}
        >
          <HelpCircle size={12} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] leading-relaxed", cancelled ? "text-muted-foreground" : "text-foreground")}>
            {question}
          </p>
          <time className="mt-0.5 block text-[10.5px] tabular-nums text-muted-foreground">{fmtTime(item.occurredAt)}</time>
        </div>
      </div>

      {cancelled ? (
        <p className="mt-2 pl-9 text-[11.5px] text-muted-foreground">Cancelled — the run ended before this was answered.</p>
      ) : answer ? (
        <div className="mt-2 flex justify-end pl-10">
          <div className="max-w-[80%]">
            <p className="mb-0.5 pr-1 text-right text-[10.5px] font-medium text-muted-foreground">You</p>
            <div className="rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-[13px] leading-relaxed text-background">{answer}</div>
            <p className="mt-0.5 pr-1 text-right text-[10.5px] tabular-nums text-muted-foreground">{item.resolvedAt ? fmtTime(item.resolvedAt) : ""}</p>
          </div>
        </div>
      ) : answerable ? (
        <div className="mt-2.5 pl-9">
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={sending}
                  onClick={() => submit(option)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] text-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="flex max-w-md gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit(draft);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={sending}
                placeholder="Type your answer…"
                className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-[12.5px] font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 pl-9">
          <span className="size-2.5 animate-pulse rounded-full border-[1.5px] border-warning border-t-transparent" />
          <span className="text-[12px] text-warning">Waiting for your answer…</span>
        </div>
      )}
    </div>
  );
}

/** A visible "the agent spun in place" line: N model calls, no progress. */
export function StallRow({ item }: { item: Extract<TimelineItem, { kind: "stall" }> }) {
  const minutes = item.seconds >= 60 ? `${Math.floor(item.seconds / 60)}m ${item.seconds % 60}s` : `${item.seconds}s`;
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1">
      <span className="size-1 shrink-0 rounded-full bg-warning" />
      <span className="text-[12px] text-warning">
        Stalled for {minutes} · {item.calls} model calls without progress
      </span>
      <time className="ml-auto shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
        {fmtTime(item.occurredAt)} – {fmtTime(item.endedAt)}
      </time>
    </div>
  );
}

/** Final submission approval, inline in the chat: a compact IRREVERSIBLE ACTION
 * card with Approve/Reject, resolved state shows the decision. */
export function SubmissionApprovalCard({
  item,
  onDecide,
}: {
  item: Extract<TimelineItem, { kind: "submission" }>;
  onDecide?: (requestId: string, decision: "approve" | "reject") => void;
}) {
  const [showContext, setShowContext] = useState(false);
  const [sending, setSending] = useState(false);
  const resolved = item.decision === "approved" || item.decision === "rejected";
  const requestId = item.request_id;
  const decide = (decision: "approve" | "reject") => {
    if (!requestId || !onDecide || sending) return;
    setSending(true);
    onDecide(requestId, decision);
  };

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-approval-border bg-approval px-3.5 py-2.5">
      <div className="flex items-center gap-2">
        <ShieldAlert size={13} className={cn("shrink-0", resolved ? (item.decision === "approved" ? "text-success" : "text-destructive") : "text-destructive")} />
        <span className={cn("text-[11px] font-semibold tracking-wide", resolved ? (item.decision === "approved" ? "text-success" : "text-destructive") : "text-destructive")}>
          {resolved ? (item.decision === "approved" ? "Submission approved" : "Submission rejected") : "Irreversible action"}
        </span>
        {!resolved && <span className="hidden text-[10.5px] text-destructive/70 sm:inline">· requires your approval</span>}
        <time className="ml-auto shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{fmtTime(item.occurredAt)}</time>
      </div>
      <p className="mt-1.5 text-[13px] font-medium text-foreground">{item.question || item.detail || "Submit this application?"}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {!resolved && requestId && onDecide && (
          <>
            <button
              type="button"
              disabled={sending}
              onClick={() => decide("approve")}
              className="rounded-lg bg-destructive px-3 py-1 text-[12px] font-medium text-white transition hover:bg-destructive/90 disabled:opacity-50"
            >
              Approve submission
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => decide("reject")}
              className="rounded-lg border border-border bg-card px-3 py-1 text-[12px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {item.context && (
          <button
            type="button"
            onClick={() => setShowContext((value) => !value)}
            className="ml-auto flex items-center gap-1 px-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={11} className={cn("transition-transform", showContext && "rotate-90")} />
            Review evidence
          </button>
        )}
      </div>
      {showContext && item.context && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-card/80 px-3 py-2 font-mono text-[12.5px] leading-5 tabular-nums whitespace-pre-wrap text-muted-foreground">
          {item.context}
        </pre>
      )}
    </div>
  );
}

/** System events (run/browser/artifact/auth/context/notice): one whisper line.
 * Timestamps return here — the expanded detail must show that events happened
 * at different times, only the collapsed summary is time-free. */
export function SystemRow({ item, compact = false }: { item: TimelineItem; compact?: boolean }) {
  const label = systemLabel(item);
  const tone = systemTone(item);
  const detail = systemDetail(item);
  const occurredAt = "item" in item ? item.item.occurredAt : item.occurredAt;
  if (compact) {
    return (
      <div className="flex items-baseline gap-2 py-0.5">
        <span className={cn("min-w-0 flex-1 truncate text-[12px]", tone)}>{label}</span>
        {detail && <span className="min-w-0 max-w-[45%] truncate text-[12px] text-muted-foreground">{detail}</span>}
        <time className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{fmtTime(occurredAt)}</time>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-0.5 py-0.5">
      <span className={cn("size-1 shrink-0 rounded-full", item.kind === "notice" && item.level === "error" ? "bg-destructive" : "bg-muted-foreground/60")} />
      <span className={cn("min-w-0 flex-1 truncate text-[12px]", tone)}>{label}</span>
      {detail && <span className="min-w-0 max-w-[40%] truncate text-[12px] text-muted-foreground">{detail}</span>}
      <time className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">{fmtTime(occurredAt)}</time>
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
      return item.level === "error" ? "text-destructive" : "text-warning";
    case "auth":
      return item.status === "failed" ? "text-destructive" : item.status === "completed" ? "text-success" : "text-muted-foreground";
    case "human":
      return item.sub === "requested" ? "text-warning" : "text-muted-foreground";
    case "submission":
      return item.sub === "approved" || item.sub === "verified" ? "text-success" : "text-muted-foreground";
    case "run":
      return item.sub === "Interrupted" || item.sub === "Start failed" ? "text-destructive" : "text-muted-foreground";
    default:
      return "text-muted-foreground";
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
