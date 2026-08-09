import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "../../types";
import { buildTimeline } from "./build";
import type { AgentSegmentItem, TimelineItem } from "./types";

function ev(sequence: number, type: string, sourceAgent: string, payload: Record<string, unknown> = {}, occurredAt = `2026-08-03T10:00:${String(sequence).padStart(2, "0")}Z`): ActivityEvent {
  return {
    database_id: sequence,
    run_id: "run-x",
    sequence,
    occurred_at: occurredAt,
    type,
    source: { component: "core", ...(sourceAgent ? { agent: sourceAgent } : {}) },
    level: "info",
    payload,
  };
}

function start(seq: number, agent: string, path?: string): ActivityEvent {
  return ev(seq, "agent.started", agent, { status: "started", ...(path ? { path } : {}) });
}
function end(seq: number, agent: string, failed = false): ActivityEvent {
  return ev(seq, failed ? "agent.failed" : "agent.completed", agent, { status: failed ? "failed" : "completed", error: failed ? "boom" : "" });
}
function turn(seq: number, agent: string): ActivityEvent {
  return ev(seq, "agent.turn.completed", agent, { text: `turn ${seq}` });
}
function tool(seq: number, agent: string, callId = `c${seq}`): ActivityEvent {
  return ev(seq, "tool.started", agent, { tool_name: "read_page", tool_call_id: callId, input: {} });
}
function model(seq: number, agent: string): ActivityEvent {
  return ev(seq, "model.selected", agent, { model_id: "acme/x", role: agent });
}

function kinds(items: TimelineItem[]): string[] {
  return items.map((item) => item.kind);
}

function segmentOf(items: TimelineItem[], agent: string): AgentSegmentItem | undefined {
  for (const item of items) {
    if (item.kind === "agent-segment") {
      if (item.agent === agent) return item;
      const nested = segmentOf(item.items, agent);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Collect only the top-level (un-nested) agent segments. */
function topLevelSegments(items: TimelineItem[]): AgentSegmentItem[] {
  return items.filter((item): item is AgentSegmentItem => item.kind === "agent-segment");
}

describe("buildTimeline segmentation", () => {
  it("groups contiguous per-agent work into agent-segments, absorbing agent-attributed model events", () => {
    const events = [
      start(5, "orchestrator", "/orchestrator"),
      model(6, "orchestrator"),
      turn(7, "orchestrator"),
      tool(8, "orchestrator"),
      start(9, "AuthenticationSpecialist", "/orchestrator/auth"),
      turn(10, "AuthenticationSpecialist"),
      tool(11, "AuthenticationSpecialist"),
      end(12, "AuthenticationSpecialist"),
      turn(13, "orchestrator"),
      tool(14, "orchestrator"),
      end(15, "orchestrator"),
    ];
    const items = buildTimeline(events);
    const authSeg = segmentOf(items, "AuthenticationSpecialist")!;
    const orchSeg = segmentOf(items, "orchestrator")!;
    expect(authSeg.agent).toBe("AuthenticationSpecialist");
    expect(authSeg.parent).toBe("orchestrator");
    expect(authSeg.spawned).toBe(1);
    expect(authSeg.parallel).toBe(false);
    expect(authSeg.status).toBe("completed");
    expect(authSeg.key).toBe("AuthenticationSpecialist:10");
    expect(authSeg.items.map((inner) => inner.kind)).toEqual(["turn", "tool"]);
    expect(orchSeg.agent).toBe("orchestrator");
    expect(orchSeg.key).toBe("orchestrator:6");
    // AuthenticationSpecialist nests inside the orchestrator, sorted by seq.
    expect(orchSeg.items.map((inner) => inner.kind)).toEqual(["model", "turn", "tool", "agent-segment", "turn", "tool"]);
  });

  it("coalesces same-agent segments interrupted by another agent into a single run", () => {
    const events = [
      start(5, "orchestrator", "/orchestrator"),
      turn(7, "orchestrator"),
      tool(8, "orchestrator"),
      start(9, "AnswerWriter", "/orchestrator/aw"),
      turn(10, "AnswerWriter"),
      end(11, "AnswerWriter"),
      turn(13, "orchestrator"),
      tool(14, "orchestrator"),
      end(15, "orchestrator"),
    ];
    const items = buildTimeline(events);
    const orchSeg = segmentOf(items, "orchestrator")!;
    // Subagent interruptions must not fragment the coordinator into many
    // runs: the orchestrator shows once in the agents drawer.
    expect(orchSeg.runs).toHaveLength(1);
    expect(orchSeg.spawned).toBe(1);
    expect(orchSeg.status).toBe("running");
    expect(orchSeg.runs[0].items.map((inner) => inner.kind)).toEqual(["turn", "tool", "agent-segment", "turn", "tool"]);
    // AnswerWriter still nests inside the orchestrator's merged run, sorted by seq.
    expect(orchSeg.runs[0].items[2]).toMatchObject({ agent: "AnswerWriter" });
  });

  it("flags parallel double-start and counts spawned runs", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      start(11, "AnswerWriter", "/orchestrator/aw"),
      start(12, "AnswerWriter", "/orchestrator/aw"),
      turn(13, "AnswerWriter"),
      turn(14, "AnswerWriter"),
      end(15, "AnswerWriter"),
      end(16, "AnswerWriter"),
      end(17, "orchestrator"),
    ];
    const items = buildTimeline(events);
    const seg = segmentOf(items, "AnswerWriter")!;
    expect(seg.spawned).toBe(2);
    expect(seg.parallel).toBe(true);
    expect(seg.status).toBe("completed");
  });

  it("sequential re-starts are not parallel", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      start(11, "AnswerWriter", "/orchestrator/aw"),
      turn(12, "AnswerWriter"),
      end(13, "AnswerWriter"),
      start(14, "AnswerWriter", "/orchestrator/aw"),
      turn(15, "AnswerWriter"),
      end(16, "AnswerWriter"),
      end(17, "orchestrator"),
    ];
    const items = buildTimeline(events);
    const seg = segmentOf(items, "AnswerWriter")!;
    expect(seg.spawned).toBe(2);
    expect(seg.parallel).toBe(false);
  });

  it("failed marker wins over completed and sets endedAt", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      start(11, "VisionSpecialist", "/orchestrator/vis"),
      turn(12, "VisionSpecialist"),
      end(13, "VisionSpecialist", true),
      end(14, "orchestrator"),
    ];
    const items = buildTimeline(events);
    const seg = segmentOf(items, "VisionSpecialist")!;
    expect(seg.status).toBe("failed");
    expect(seg.endedAt).toContain("10:00:13");
  });

  it("orphan terminal markers never open segments; segment without items is dropped", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      start(11, "AuthProbe", "/orchestrator/p"),
      end(12, "AuthProbe"),
      turn(13, "orchestrator"),
      end(14, "orchestrator"),
    ];
    const items = buildTimeline(events);
    expect(segmentOf(items, "AuthProbe")).toBeUndefined();
    expect(topLevelSegments(items)).toHaveLength(1);
    expect(topLevelSegments(items)[0].agent).toBe("orchestrator");
  });

  it("turn-opened segment has spawned 0 and stays running", () => {
    const events = [turn(10, "orchestrator"), tool(11, "orchestrator")];
    const items = buildTimeline(events);
    const seg = topLevelSegments(items)[0];
    expect(seg.spawned).toBe(0);
    expect(seg.status).toBe("running");
    expect(seg.parent).toBeUndefined();
  });

  it("agent-attributed model events attach inside the open segment, recovery attaches to the running agent", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      turn(11, "orchestrator"),
      model(12, "orchestrator"),
      turn(13, "orchestrator"),
      end(14, "orchestrator"),
    ];
    const items = buildTimeline(events);
    expect(kinds(items)).toEqual(["agent-segment"]);
    const seg = items[0] as AgentSegmentItem;
    expect(seg.items.map((inner) => inner.kind)).toEqual(["turn", "model", "turn"]);
  });

  it("attributes parent-run tool events to the open subagent segment instead of flushing it", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      start(11, "AnswerWriter", "('orchestrator:123', 'tools:abc')"),
      turn(12, "AnswerWriter"),
      tool(13, "orchestrator", "c13"),
      tool(14, "orchestrator", "c14"),
      end(15, "AnswerWriter"),
      end(16, "AnswerWriter"),
      start(17, "AnswerWriter"),
      turn(18, "AnswerWriter"),
      end(19, "AnswerWriter"),
      end(20, "orchestrator"),
    ];
    const items = buildTimeline(events);
    const seg = segmentOf(items, "AnswerWriter")!;
    expect(seg).toBeDefined();
    expect(seg.spawned).toBe(2);
    expect(seg.status).toBe("completed");
    expect(seg.items.map((inner) => inner.kind)).toEqual(["turn", "tool", "tool", "turn"]);
    const parentTools = seg.items.filter((inner) => inner.kind === "tool") as Array<TimelineItem & { kind: "tool" }>;
    expect(parentTools.map((inner) => inner.item.agent)).toEqual(["AnswerWriter", "AnswerWriter"]);
  });

  it("recovery events land inside the running agent segment that made the mistake", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      turn(11, "orchestrator"),
      ev(12, "recovery.started", "orchestrator", { attempt: 1, error_type: "ToolProtocolViolation", error: "model repeated an invalid candidate delegation" }),
      turn(13, "orchestrator"),
      end(14, "orchestrator"),
    ];
    const items = buildTimeline(events);
    expect(kinds(items)).toEqual(["agent-segment"]);
    const seg = items[0] as AgentSegmentItem;
    expect(seg.items.map((inner) => inner.kind)).toEqual(["turn", "recovery", "turn"]);
    const recovery = seg.items[1] as TimelineItem & { kind: "recovery" };
    expect(recovery.stage).toBe("started");
    expect(recovery.attempt).toBe(1);
    expect(recovery.errorType).toBe("ToolProtocolViolation");
  });

  it("nests subagent segments inside their parent orchestrator segment", () => {
    const events = [
      start(10, "orchestrator", "/orchestrator"),
      turn(11, "orchestrator"),
      start(12, "AnswerWriter", "/orchestrator/aw"),
      turn(13, "AnswerWriter"),
      tool(14, "AnswerWriter", "c14"),
      end(15, "AnswerWriter"),
      turn(16, "orchestrator"),
      end(17, "orchestrator"),
    ];
    const items = buildTimeline(events);
    // Only the orchestrator stays top-level; AnswerWriter is nested inside it.
    const top = topLevelSegments(items);
    expect(top).toHaveLength(1);
    expect(top[0].agent).toBe("orchestrator");
    const child = top[0].items.find((inner): inner is AgentSegmentItem => inner.kind === "agent-segment");
    expect(child).toBeDefined();
    expect(child!.agent).toBe("AnswerWriter");
    expect(child!.parent).toBe("orchestrator");
    expect(child!.items.map((inner) => inner.kind)).toEqual(["turn", "tool"]);
  });

  it("keeps orphan subagent segments top-level when the parent is unknown", () => {
    const events = [
      start(10, "AnswerWriter", "/ghost/aw"),
      turn(11, "AnswerWriter"),
      end(12, "AnswerWriter"),
    ];
    const items = buildTimeline(events);
    const top = topLevelSegments(items);
    expect(top).toHaveLength(1);
    expect(top[0].agent).toBe("AnswerWriter");
  });
});
