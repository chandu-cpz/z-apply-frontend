import type { LiveAgent } from "../../lib/live";
import type {
  AgentSegmentItem,
  ModelClusterItem,
  TimelineItem,
  ToolItem,
  TurnItem,
} from "../../lib/timeline/types";
import { itemSeq } from "../../lib/timeline/types";

export type ChatRow =
  | { kind: "assistant-live"; agent: LiveAgent }
  | { kind: "turn"; item: TurnItem }
  | { kind: "tool"; item: ToolItem }
  | { kind: "section"; key: string; agent: string; status: string; seq: number; occurredAt: string; parent?: string }
  | { kind: "run-label"; label: string; seq: number; startedAt: string; status: string }
  | { kind: "recovery"; item: Extract<TimelineItem, { kind: "recovery" }> }
  | { kind: "model-cluster"; item: ModelClusterItem }
  | { kind: "row"; item: TimelineItem }
  | { kind: "activity-group"; seq: number; children: ChatRow[] };

/** System events never render in the thread — they collect into a single
 * "Activity" disclosure. The thread stays a pure conversation: turns, tools,
 * agent sections, run labels and HITL handoffs are visible; run lifecycle,
 * browser, model, auth, recovery and other telemetry fold away. */
export function isQuiet(row: ChatRow): boolean {
  if (row.kind === "model-cluster") return true;
  if (row.kind !== "row") return false;
  // HITL handoff cards AND pending (unanswered) requests stay visible and
  // interactive; only resolved/cancelled human events fold away.
  if (row.item.kind === "human" && (row.item.sub === "handoff" || row.item.sub === "requested")) return false;
  return [
    "model",
    "browser",
    "agent",
    "context",
    "run",
    "auth",
    "submission",
    "artifact",
    "notice",
    "recovery",
    "human",
  ].includes(row.item.kind);
}

/** Collapse consecutive quiet system rows into one expandable activity group. */
export function groupRows(rows: ChatRow[]): ChatRow[] {
  const out: ChatRow[] = [];
  let pending: ChatRow[] = [];
  const flush = () => {
    if (pending.length === 1) {
      out.push(pending[0]);
    } else if (pending.length > 1) {
      out.push({ kind: "activity-group", seq: rowSeq(pending[0]), children: pending });
    }
    pending = [];
  };
  for (const row of rows) {
    if (isQuiet(row)) {
      pending.push(row);
    } else {
      flush();
      out.push(row);
    }
  }
  flush();
  return out;
}

function rowSeq(row: ChatRow): number {
  switch (row.kind) {
    case "assistant-live":
      return row.agent.firstSeq;
    case "turn":
      return row.item.seq;
    case "tool":
      return row.item.seq;
    case "section":
      return row.seq;
    case "run-label":
      return row.seq;
    case "recovery":
      return row.item.seq;
    case "model-cluster":
      return row.item.seq;
    case "row":
      return itemSeq(row.item);
    case "activity-group":
      return row.seq;
  }
}

export function flattenTimeline(items: TimelineItem[], rows: ChatRow[]): void {
  for (const item of items) {
    if (item.kind === "agent-segment") {
      rows.push({
        kind: "section",
        key: item.key,
        agent: item.agent,
        status: item.status,
        seq: item.seq,
        occurredAt: item.endedAt || item.occurredAt,
        parent: item.parent,
      });
      flattenSegment(item, rows);
    } else {
      rows.push(rowFor(item));
    }
  }
}

function flattenSegment(segment: AgentSegmentItem, rows: ChatRow[]): void {
  if (segment.runs.length > 1) {
    segment.runs.forEach((run, index) => {
      rows.push({
        kind: "run-label",
        label: `run ${index + 1}`,
        seq: run.seq,
        startedAt: run.startedAt,
        status: run.status,
      });
      flattenTimeline(run.items, rows);
    });
    return;
  }
  if (segment.runs.length === 1) {
    flattenTimeline(segment.runs[0].items, rows);
    return;
  }
  flattenTimeline(segment.items, rows);
}

function rowFor(item: TimelineItem): ChatRow {
  if (item.kind === "turn") return { kind: "turn", item: item.item };
  if (item.kind === "tool") return { kind: "tool", item: item.item };
  if (item.kind === "recovery") return { kind: "recovery", item };
  if (item.kind === "model-cluster") return { kind: "model-cluster", item };
  return { kind: "row", item };
}

export function rowKey(row: ChatRow): string {
  switch (row.kind) {
    case "assistant-live":
      return `live-${row.agent.agent}-${row.agent.firstSeq}`;
    case "turn":
      return `turn-${row.item.seq}`;
    case "tool":
      return `tool-${row.item.seq}`;
    case "section":
      return `section-${row.key}`;
    case "run-label":
      return `run-${row.seq}`;
    case "recovery":
      return `recovery-${row.item.seq}`;
    case "model-cluster":
      return `model-cluster-${row.item.seq}`;
    case "row":
      return `row-${itemSeq(row.item)}`;
    case "activity-group":
      return `activity-${row.seq}`;
  }
}
