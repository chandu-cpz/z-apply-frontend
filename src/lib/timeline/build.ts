import type { ActivityEvent } from "../../types";
import { asRecord, humanModel, num, str, textOf } from "../format";
import { agentOf } from "../agent";
import { itemSeq, type AgentSegmentItem, type AgentRun, type TimelineItem, type ToolItem } from "./types";

// ---------------------------------------------------------------------------
// Shared helpers (kept private - not transforms)
// ---------------------------------------------------------------------------

/** Best-effort parent agent label from an agent.started payload path. */
function parentOf(event: Pick<ActivityEvent, "payload">): string | undefined {
  const rawPath = str(event.payload.path);
  if (rawPath) {
    if (rawPath.includes("(") && rawPath.includes(":")) {
      const nodes = rawPath
        .replace(/[()']/g, "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const parentNode = nodes.length >= 2 ? nodes[nodes.length - 2].split(":")[0] : "";
      if (parentNode) return parentNode;
    }
    const segments = rawPath.split("/").filter(Boolean);
    if (segments.length >= 2) return segments[segments.length - 2];
  }
  const parent = event.payload.parent;
  if (typeof parent === "string" && parent.length > 0) return parent;
  return undefined;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const BROWSER_SUBS: Record<string, string> = {
  "browser.page_opened": "Page opened",
  "browser.page_focused": "Page focused",
  "browser.page_closed": "Page closed",
  "browser.closed": "Workspace closed",
  "browser.control_taken": "Human control taken",
  "browser.control_returned": "Control returned to agent",
  "browser.snapshot_refreshed": "Fresh evidence captured",
};

const RUN_SUBS: Record<string, string> = {
  "run.queued": "Queued",
  "run.started": "Started",
  "run.phase_changed": "Phase changed",
  "run.cancel_requested": "Cancel requested",
  "run.terminal": "Finished",
  "run.ledger": "Call ledger saved",
  "run.interrupted": "Interrupted",
  "run.start_failed": "Start failed",
};

function eventDetail(event: ActivityEvent): string {
  const payload = event.payload;
  const text = str(payload.summary) || str(payload.error) || str(payload.excerpt) || str(payload.phase) || str(payload.outcome);
  return text.slice(0, 240);
}

// ---------------------------------------------------------------------------
// Transform 1: buildStall is part of raw parsing
// It is exposed as a testable helper below.
// ---------------------------------------------------------------------------

export interface StallTracker {
  noteModelCall(seq: number, occurredAt: string): void;
  handleProgressType(type: string): void;
  flush(into: TimelineItem[]): void;
  get calls(): number;
}

export function buildStall(into: TimelineItem[]): StallTracker {
  const PROGRESS_TYPES = new Set([
    "agent.turn.completed",
    "tool.started",
    "tool.completed",
    "tool.failed",
    "human.requested",
    "human.resolved",
    "human.cancelled",
    "submission.approval_requested",
    "submission.approved",
    "submission.rejected",
  ]);
  let stallCalls = 0;
  let stallStart: { seq: number; occurredAt: string } | null = null;
  let stallLastAt = "";
  const emitStall = (target: TimelineItem[]) => {
    if (stallStart === null || stallCalls < 12) return;
    const seconds = Math.max(0, Math.round((Date.parse(stallLastAt) - Date.parse(stallStart.occurredAt)) / 1000));
    target.push({
      kind: "stall",
      seq: stallStart.seq,
      calls: stallCalls,
      seconds,
      occurredAt: stallStart.occurredAt,
      endedAt: stallLastAt || stallStart.occurredAt,
    });
  };
  return {
    get calls() {
      return stallCalls;
    },
    noteModelCall(seq: number, occurredAt: string) {
      if (stallStart === null) stallStart = { seq, occurredAt };
      stallCalls += 1;
      stallLastAt = occurredAt;
    },
    handleProgressType(type: string) {
      if (PROGRESS_TYPES.has(type)) {
        emitStall(into);
        stallCalls = 0;
        stallStart = null;
        stallLastAt = "";
      }
    },
    flush(target: TimelineItem[]) {
      emitStall(target);
    },
  };
}

// Raw parse: events -> sorted raw items + parent map. Keeps the big loop but delegates stall/usage.
function parseRaw(events: ActivityEvent[]): { items: TimelineItem[]; parentByLabel: Map<string, string | undefined> } {
  const items: TimelineItem[] = [];
  const modelByAgent = new Map<string, string>();
  let runModel: string | undefined;
  const tools = new Map<string, ToolItem>();
  const modelUsageMap = new Map<string, { inputTokens: number; outputTokens: number; tokPerSecond: number; calls: number; durationMs: number }>();
  const parentByLabel = new Map<string, string | undefined>();
  const stall = buildStall(items);
  const modelFor = (agent: string): string | undefined => modelByAgent.get(agent) || runModel;

  for (const event of events) {
    const type = event.type;
    const payload = event.payload;
    const agent = agentOf(event);
    const seq = event.sequence;
    const occurredAt = event.occurred_at;
    if (type === "graph.event") continue;

    stall.handleProgressType(type);

    if (type === "model.call_completed" || type === "model.call.metrics") {
      stall.noteModelCall(seq, occurredAt);
      continue;
    }

    if (type === "model.usage") {
      const usageAgent = str(payload.agent) || agent;
      const model = str(payload.model);
      if (model) {
        modelByAgent.set(usageAgent, model);
        runModel = model;
      }
      const cur = modelUsageMap.get(usageAgent) ?? { inputTokens: 0, outputTokens: 0, tokPerSecond: 0, calls: 0, durationMs: 0 };
      cur.inputTokens += Math.round(num(payload.input_tokens));
      cur.outputTokens += Math.round(num(payload.output_tokens));
      cur.tokPerSecond += num(payload.tok_per_second);
      cur.calls += 1;
      cur.durationMs = num(payload.duration_ms);
      modelUsageMap.set(usageAgent, cur);
      continue;
    }

    if (type === "model.selected") {
      const model = str(payload.model_id);
      const selectedAgent = str(payload.role) || str(payload.agent_path) || agent;
      if (model) {
        modelByAgent.set(selectedAgent, model);
        runModel = model;
      }
      const tags = [payload.tools && "tools", payload.reasoning && "reasoning", payload.vision && "vision"].filter(Boolean).join(" · ");
      items.push({ kind: "model", seq, sub: "selected", agent: selectedAgent, model: humanModel(model), detail: tags, occurredAt });
      continue;
    }

    if (type === "model.rotated" || type === "model.rate_limited" || type === "model.failed") {
      const model = str(payload.model_id) || str(payload.model) || runModel;
      const routingAgent = str(payload.role) || str(payload.agent_path) || agent;
      items.push({ kind: "model", seq, sub: type.replace("model.", ""), agent: routingAgent, model: humanModel(model), detail: eventDetail(event), occurredAt });
      continue;
    }

    if (type === "agent.turn.completed") {
      const turnModel = str(payload.model) || modelFor(agent);
      const usageRaw = asRecord(payload.usage);
      // per-agent usage accumulated from model.usage events; falls back to the
      // turn payload when no metrics arrived for this agent
      const pending = modelUsageMap.get(agent);
      const usage = pending ?? {
        inputTokens: Math.round(num(usageRaw.input_tokens)),
        outputTokens: Math.round(num(usageRaw.output_tokens)),
        tokPerSecond: num(usageRaw.tok_per_second),
        calls: 0,
        durationMs: num(payload.duration_ms),
      };
      const toolCalls = Array.isArray(payload.tool_calls)
        ? (payload.tool_calls as unknown[]).map((call, index) => {
            const record = asRecord(call);
            return {
              index: index,
              id: str(record.id),
              name: str(record.name),
              args: textOf(record.args, 140),
            };
          })
        : [];
      items.push({
        kind: "turn",
        item: {
          key: String(event.database_id),
          seq,
          agent,
          occurredAt,
          text: str(payload.text),
          reasoning: str(payload.reasoning),
          model: humanModel(turnModel),
          usage,
          toolCalls,
        },
      });
      modelUsageMap.delete(agent);
      continue;
    }

    if (type === "tool.started" || type === "tool.completed" || type === "tool.failed") {
      const callId = str(payload.tool_call_id) || `${seq}`;
      const name = str(payload.tool_name);
      const existing = tools.get(callId);
      if (type === "tool.started") {
        tools.set(callId, {
          key: `${callId}-${seq}`,
          seq,
          agent,
          name,
          args: stringify(payload.input),
          output: "",
          error: "",
          failed: false,
          inFlight: true,
          model: humanModel(str(payload.model_id) || modelFor(agent)),
          durationMs: 0,
          occurredAt,
        });
        continue;
      }
      if (existing) {
        const ended = new Date(occurredAt).getTime();
        const started = new Date(existing.occurredAt).getTime();
        existing.inFlight = false;
        existing.failed = type === "tool.failed" || Boolean(str(payload.error));
        existing.error = str(payload.error) || (type === "tool.failed" ? "tool failed" : "");
        existing.output = type === "tool.completed" ? textOf(payload.output, 900) : "";
        existing.durationMs = Number.isFinite(started) && Number.isFinite(ended) ? ended - started : 0;
        items.push({ kind: "tool", item: { ...existing } });
        tools.delete(callId);
        continue;
      }
      items.push({
        kind: "tool",
        item: {
          key: `${callId}-${seq}`,
          seq,
          agent,
          name,
          args: "",
          output: stringify(payload.output),
          error: str(payload.error) || (type === "tool.failed" ? "tool failed" : ""),
          failed: type === "tool.failed",
          inFlight: false,
          model: humanModel(str(payload.model_id) || modelFor(agent)),
          durationMs: 0,
          occurredAt,
        },
      });
      continue;
    }

    if (type === "agent.started" || type === "agent.completed" || type === "agent.failed") {
      if (type === "agent.started" && !parentByLabel.has(agent)) parentByLabel.set(agent, parentOf(event));
      items.push({
        kind: "agent",
        seq,
        agent,
        status: type === "agent.started" ? "started" : type === "agent.completed" ? "completed" : "failed",
        detail: type === "agent.failed" ? str(payload.error) : "",
        occurredAt,
      });
      continue;
    }

    if (type === "recovery.started" || type === "recovery.completed" || type === "recovery.exhausted") {
      items.push({
        kind: "recovery",
        seq,
        attempt: Math.round(num(payload.attempt)),
        errorType: str(payload.error_type),
        detail: str(payload.error) || (type === "recovery.started" ? "recovering from a failed attempt" : type.replace("recovery.", "")),
        stage: type.replace("recovery.", ""),
        occurredAt,
      });
      continue;
    }

    if (type.startsWith("browser.")) {
      items.push({ kind: "browser", seq, sub: BROWSER_SUBS[type] ?? type.replace("browser.", ""), detail: eventDetail(event), occurredAt });
      continue;
    }

    if (type === "human.requested" || type === "human.resolved" || type === "human.cancelled") {
      const sub = type.replace("human.", "");
      const detail = type === "human.requested"
        ? str(payload.question)
        : str(payload.answer) ? `answered: ${str(payload.answer)}` : str(payload.responder) ? `resolved via ${str(payload.responder)}` : sub;
      items.push({
        kind: "human",
        seq,
        sub,
        detail: detail.slice(0, 200),
        occurredAt,
        // Resolution payloads also carry request_id; pairHuman matches on it
        // so concurrent requests can never cross-pair by list order.
        request_id: str(payload.request_id) || undefined,
        ...(type === "human.requested"
          ? {
              options: Array.isArray(payload.options) ? payload.options.map(String) : [],
              allow_free_text: Boolean(payload.allow_free_text),
            }
          : {}),
      });
      continue;
    }

    if (type.startsWith("submission.")) {
      const sub = type.replace("submission.", "");
      if (type === "submission.approval_requested") {
        items.push({
          kind: "submission",
          seq,
          sub: "approval_requested",
          detail: str(payload.question),
          occurredAt,
          question: str(payload.question),
          request_id: str(payload.request_id),
          options: Array.isArray(payload.options) ? payload.options.map(String) : [],
          risk: str(payload.risk),
          context: str(payload.context),
        });
        continue;
      }
      const detail = sub === "approved" || sub === "rejected" ? `by ${str(payload.responder)}` : eventDetail(event);
      items.push({ kind: "submission", seq, sub, detail: detail.slice(0, 200), occurredAt, request_id: str(payload.request_id) || undefined });
      continue;
    }

    if (type === "artifact.created") {
      items.push({ kind: "artifact", seq, filename: str(payload.filename), kind2: str(payload.kind), occurredAt });
      continue;
    }

    if (type.startsWith("run.")) {
      const detail = type === "run.phase_changed" ? `→ ${str(payload.phase)}` : eventDetail(event);
      items.push({ kind: "run", seq, sub: RUN_SUBS[type] ?? type.replace("run.", ""), detail, occurredAt });
      continue;
    }

    if (type === "authentication.evidence") {
      items.push({ kind: "auth", seq, status: str(payload.status), summary: str(payload.summary), occurredAt });
      continue;
    }

    if (type === "context.received") {
      items.push({ kind: "context", seq, source: str(payload.source), content: textOf(payload.content, 220), occurredAt });
      continue;
    }

    if (event.level === "warning" || event.level === "error") {
      items.push({ kind: "notice", seq, level: event.level, message: textOf(payload, 400), occurredAt });
      continue;
    }
  }

  for (const tool of tools.values()) {
    items.push({ kind: "tool", item: tool });
  }

  // flush any remaining stall
  stall.flush(items);

  // sort
  const sorted = items.sort((left, right) => ("item" in left ? left.item.seq : left.seq) - ("item" in right ? right.item.seq : right.seq));
  return { items: sorted, parentByLabel };
}

// ---------------------------------------------------------------------------
// Transform 2: pairHuman
// ---------------------------------------------------------------------------
export function pairHuman(sorted: TimelineItem[]): TimelineItem[] {
  const paired: TimelineItem[] = [];
  const pairedIndexes = new Set<number>();
  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const isRequest =
      (item.kind === "human" && item.sub === "requested") ||
      (item.kind === "submission" && item.sub === "approval_requested");
    if (isRequest && !pairedIndexes.has(index)) {
      const resolutionSubs =
        item.kind === "human" ? new Set(["resolved", "cancelled"]) : new Set(["approved", "rejected"]);
      const requestId = item.request_id;
      let resolvedIndex = index + 1;
      while (resolvedIndex < sorted.length) {
        const candidate = sorted[resolvedIndex];
        // Match on the backend's request_id first so concurrent requests
        // cannot cross-pair; id-less candidates fall back to kind order
        // (defensive, e.g. hand-built fixtures).
        if (
          candidate.kind === item.kind &&
          resolutionSubs.has(candidate.sub) &&
          (!requestId || !candidate.request_id || candidate.request_id === requestId)
        ) break;
        resolvedIndex += 1;
      }
      if (resolvedIndex < sorted.length) {
        const resolved = sorted[resolvedIndex] as Extract<TimelineItem, { kind: "human" | "submission" }>;
        pairedIndexes.add(index);
        pairedIndexes.add(resolvedIndex);
        if (item.kind === "human") {
          paired.push({
            ...item,
            sub: resolved.sub === "resolved" ? "handoff" : "cancelled",
            question: item.detail,
            answer: resolved.sub === "resolved" ? resolved.detail.replace(/^answered: /, "") : undefined,
            resolvedAt: resolved.sub === "resolved" ? resolved.occurredAt : undefined,
          });
        } else {
          paired.push({
            ...item,
            sub: resolved.sub,
            decision: resolved.sub,
            decidedAt: resolved.occurredAt,
          });
        }
        continue;
      }
    }
    if (!pairedIndexes.has(index)) paired.push(item);
  }
  return paired;
}

// ---------------------------------------------------------------------------
// Transform 3: clusterModels
// ---------------------------------------------------------------------------
export function clusterModels(items: TimelineItem[]): TimelineItem[] {
  const merged: TimelineItem[] = [];
  let pending: Array<TimelineItem & { kind: "model" }> = [];
  const flush = () => {
    if (pending.length === 1) {
      merged.push(pending[0]);
    } else if (pending.length > 1) {
      const last = pending[pending.length - 1];
      merged.push({
        kind: "model-cluster",
        seq: pending[0].seq,
        occurredAt: pending[0].occurredAt,
        agent: pending[0].agent,
        entries: pending.map((entry) => ({ seq: entry.seq, sub: entry.sub, agent: entry.agent, model: entry.model, detail: entry.detail, occurredAt: entry.occurredAt })),
        selected: pending.filter((entry) => entry.sub === "selected").length,
        failed: pending.filter((entry) => entry.sub === "failed").length,
        rotated: pending.filter((entry) => entry.sub === "rotated").length,
        rateLimited: pending.filter((entry) => entry.sub === "rate_limited").length,
        lastModel: last.model,
        lastSub: last.sub,
      });
    }
    pending = [];
  };
  for (const item of items) {
    if (item.kind === "model") {
      pending.push(item);
      continue;
    }
    flush();
    merged.push(item);
  }
  flush();
  return merged;
}

// ---------------------------------------------------------------------------
// Transform 4: segmentAgents
// ---------------------------------------------------------------------------
export function segmentAgents(items: TimelineItem[], parentByLabel: Map<string, string | undefined>): TimelineItem[] {
  type AgentSegment = {
    agent: string;
    parent: string | undefined;
    status: "running" | "completed" | "failed";
    spawned: number;
    parallel: boolean;
    sawStart: boolean;
    endSeen: boolean;
    occurredAt: string;
    endedAt: string;
    items: TimelineItem[];
  };
  const grouped: TimelineItem[] = [];
  let seg: AgentSegment | null = null;
  const flushSegment = () => {
    if (seg && seg.items.length > 0) {
      const first = seg.items[0];
      const firstSeq = "item" in first ? first.item.seq : first.seq;
      const last = seg.items[seg.items.length - 1];
      const lastOccurredAt = "item" in last ? last.item.occurredAt : last.occurredAt;
      const endedAt = seg.endedAt || lastOccurredAt;
      grouped.push({
        kind: "agent-segment",
        key: `${seg.agent}:${firstSeq}`,
        seq: firstSeq,
        agent: seg.agent,
        parent: seg.parent,
        depth: 0,
        spawned: seg.spawned,
        parallel: seg.parallel,
        status: seg.status,
        occurredAt: seg.occurredAt,
        endedAt,
        items: seg.items,
        runs: [{
          seq: firstSeq,
          startedAt: seg.occurredAt,
          endedAt,
          status: seg.status,
          parallel: seg.parallel,
          spawned: seg.spawned,
          items: seg.items,
        }],
      });
    }
    seg = null;
  };
  const openSegment = (label: string, anchor: TimelineItem): AgentSegment => {
    flushSegment();
    const anchorAt = "item" in anchor ? anchor.item.occurredAt : anchor.occurredAt;
    seg = {
      agent: label,
      parent: parentByLabel.get(label),
      status: "running",
      spawned: 0,
      parallel: false,
      sawStart: false,
      endSeen: false,
      occurredAt: anchorAt,
      endedAt: "",
      items: [],
    };
    return seg;
  };
  for (const item of items) {
    if (item.kind === "agent") {
      if (item.status === "started") {
        if (seg && seg.agent !== item.agent) flushSegment();
        if (!seg) seg = openSegment(item.agent, item);
        seg.spawned += 1;
        if (seg.spawned >= 2 && !seg.endSeen) seg.parallel = true;
        seg.endSeen = false;
        seg.sawStart = true;
        continue;
      }
      if (seg && seg.agent === item.agent) {
        if (item.status === "failed") seg.status = "failed";
        else if (seg.status === "running") seg.status = "completed";
        seg.endSeen = true;
        seg.endedAt = item.occurredAt;
      }
      continue;
    }
    if (item.kind === "turn" || item.kind === "tool") {
      const label = item.item.agent;
      if (seg && seg.agent !== label) {
        const parentTool = item.kind === "tool" && seg.sawStart && !seg.endSeen && seg.parent === label;
        if (!parentTool) flushSegment();
        if (parentTool) item.item.agent = seg.agent;
      }
      if (!seg) seg = openSegment(label, item);
      seg.items.push(item);
      seg.endedAt = item.item.occurredAt;
      continue;
    }
    const segRunning = seg !== null && seg.status === "running";
    const attaches =
      (item.kind === "model" || item.kind === "model-cluster")
        ? segRunning && seg!.agent === item.agent
        : (item.kind === "browser" || item.kind === "recovery")
          ? segRunning
          : false;
    if (attaches) {
      seg!.items.push(item);
      seg!.endedAt = item.occurredAt;
      continue;
    }
    flushSegment();
    grouped.push(item);
  }
  flushSegment();

  // Merge consecutive non-parallel runs of same agent
  const runsByAgent = new Map<string, TimelineItem & { kind: "agent-segment" }>();
  const runsList = new Map<string, AgentRun[]>();
  for (const item of grouped) {
    if (item.kind !== "agent-segment") continue;
    const runs = runsList.get(item.agent) ?? [];
    runs.push(item.runs[0]);
    runsList.set(item.agent, runs);
    if (!runsByAgent.has(item.agent)) {
      runsByAgent.set(item.agent, item);
    }
  }

  const final: TimelineItem[] = [];
  const emitted = new Set<string>();
  for (const item of grouped) {
    if (item.kind !== "agent-segment") {
      final.push(item);
      continue;
    }
    if (emitted.has(item.agent)) continue;
    emitted.add(item.agent);
    const runs = runsList.get(item.agent)!;
    const mergedRuns: AgentRun[] = [];
    for (const run of runs) {
      const prev = mergedRuns[mergedRuns.length - 1];
      if (prev && !prev.parallel && !run.parallel) {
        prev.items = [...prev.items, ...run.items];
        prev.endedAt = run.endedAt;
        prev.spawned = Math.max(prev.spawned, run.spawned);
      } else {
        mergedRuns.push({ ...run, items: [...run.items] });
      }
    }
    if (mergedRuns.length <= 1) {
      if (mergedRuns.length === 1) {
        final.push({ ...item, runs: mergedRuns, items: mergedRuns[0].items });
      } else {
        final.push(item);
      }
      continue;
    }
    const first = runsByAgent.get(item.agent)!;
    const last = mergedRuns[mergedRuns.length - 1];
    const status: "running" | "completed" | "failed" = mergedRuns.some((run) => run.status === "running")
      ? "running"
      : mergedRuns.some((run) => run.status === "failed")
        ? "failed"
        : "completed";
    final.push({
      ...first,
      status,
      parallel: mergedRuns.some((run) => run.parallel),
      spawned: mergedRuns.reduce((sum, run) => sum + run.spawned, 0),
      endedAt: last.endedAt,
      items: mergedRuns.flatMap((run) => run.items),
      runs: mergedRuns,
    });
  }

  return final;
}

// ---------------------------------------------------------------------------
// Transform 5: nestSegments (kept as named export)
// ---------------------------------------------------------------------------

/** Attach subagent segments inside their parent segment so the coordinator spine stays the top level. */
export function nestSegments(items: TimelineItem[]): TimelineItem[] {
  const byAgent = new Map<string, AgentSegmentItem>();
  for (const item of items) {
    if (item.kind === "agent-segment") byAgent.set(item.agent, item);
  }
  const roots: TimelineItem[] = [];
  const nested = new Set<string>();
  for (const item of items) {
    if (item.kind !== "agent-segment" || !item.parent) {
      roots.push(item);
      continue;
    }
    const parent = byAgent.get(item.parent);
    if (!parent || parent === item) {
      roots.push(item);
      continue;
    }
    nested.add(item.key);
    const targetRun = parent.runs.length > 0 ? parent.runs[parent.runs.length - 1] : undefined;
    if (targetRun) {
      targetRun.items = [...targetRun.items, item].sort((left, right) => itemSeq(left) - itemSeq(right));
    }
    parent.items = [...parent.items, item].sort((left, right) => itemSeq(left) - itemSeq(right));
  }
  const result: TimelineItem[] = [];
  for (const item of roots) {
    if (item.kind === "agent-segment" && nested.has(item.key)) continue;
    result.push(item);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Thin orchestrator
// ---------------------------------------------------------------------------
export function buildTimeline(events: ActivityEvent[]): TimelineItem[] {
  const { items: raw, parentByLabel } = parseRaw(events);
  const paired = pairHuman(raw);
  const clustered = clusterModels(paired);
  const segmented = segmentAgents(clustered, parentByLabel);
  return nestSegments(segmented);
}
