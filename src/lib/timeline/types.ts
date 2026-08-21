export interface ToolItem {
  key: string;
  seq: number;
  agent: string;
  name: string;
  args: string;
  output: string;
  error: string;
  failed: boolean;
  inFlight: boolean;
  model?: string;
  durationMs: number;
  occurredAt: string;
}

export interface TurnItem {
  key: string;
  seq: number;
  agent: string;
  occurredAt: string;
  text: string;
  reasoning: string;
  model?: string;
  usage: { inputTokens: number; outputTokens: number; tokPerSecond: number; calls: number; durationMs: number };
  toolCalls: Array<{ index: number; id: string; name: string; args: string }>;
}

export interface ModelEntry {
  seq: number;
  sub: string;
  agent: string;
  model: string;
  detail: string;
  occurredAt: string;
}

export interface AgentRun {
  seq: number;
  startedAt: string;
  endedAt: string;
  status: "running" | "completed" | "failed";
  parallel: boolean;
  spawned: number;
  items: TimelineItem[];
}

export interface ModelClusterItem {
  seq: number;
  occurredAt: string;
  agent: string;
  entries: ModelEntry[];
  selected: number;
  failed: number;
  rotated: number;
  rateLimited: number;
  lastModel: string;
  lastSub: string;
}

export interface AgentSegment {
  key: string;
  seq: number;
  agent: string;
  parent: string | undefined;
  depth: number;
  spawned: number;
  parallel: boolean;
  status: "running" | "completed" | "failed";
  occurredAt: string;
  endedAt: string;
  items: TimelineItem[];
  runs: AgentRun[];
}

export type TimelineItem =
  | { kind: "turn"; item: TurnItem }
  | { kind: "tool"; item: ToolItem }
  | { kind: "agent-segment"; key: string; seq: number; agent: string; parent: string | undefined; depth: number; spawned: number; parallel: boolean; status: "running" | "completed" | "failed"; occurredAt: string; endedAt: string; items: TimelineItem[]; runs: AgentRun[] }
  | { kind: "agent"; seq: number; agent: string; status: "started" | "completed" | "failed"; detail: string; occurredAt: string }
  | { kind: "model"; seq: number; sub: string; agent: string; model: string; detail: string; occurredAt: string }
  | { kind: "model-cluster"; seq: number; occurredAt: string; agent: string; entries: ModelEntry[]; selected: number; failed: number; rotated: number; rateLimited: number; lastModel: string; lastSub: string }
  | { kind: "browser"; seq: number; sub: string; detail: string; occurredAt: string }
  | { kind: "recovery"; seq: number; attempt: number; errorType: string; detail: string; stage: string; occurredAt: string }
  | { kind: "human"; seq: number; sub: string; detail: string; occurredAt: string; question?: string; answer?: string; resolvedAt?: string; request_id?: string; options?: string[]; allow_free_text?: boolean }
  | { kind: "submission"; seq: number; sub: string; detail: string; occurredAt: string; question?: string; request_id?: string; options?: string[]; risk?: string; context?: string; decision?: string; decidedAt?: string }
  | { kind: "artifact"; seq: number; filename: string; kind2: string; occurredAt: string }
  | { kind: "run"; seq: number; sub: string; detail: string; occurredAt: string }
  | { kind: "auth"; seq: number; status: string; summary: string; occurredAt: string }
  | { kind: "context"; seq: number; source: string; content: string; occurredAt: string }
  | { kind: "notice"; seq: number; level: "warning" | "error"; message: string; occurredAt: string }
  | { kind: "stall"; seq: number; calls: number; seconds: number; occurredAt: string; endedAt: string };

export type AgentSegmentItem = Extract<TimelineItem, { kind: "agent-segment" }>;

export function itemSeq(item: TimelineItem): number {
  return "item" in item ? item.item.seq : item.seq;
}

export function itemOccurredAt(item: TimelineItem): string {
  return "item" in item ? item.item.occurredAt : item.occurredAt;
}
