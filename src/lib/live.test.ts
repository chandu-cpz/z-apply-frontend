import { describe, expect, it } from "vitest";
import { mergeLive, turnBoundaries } from "./live";
import type { ActivityEvent, LiveActivityEvent } from "../types";

function delta(sequence: number, kind: string, text: string, agent = "researcher"): LiveActivityEvent {
  return {
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type: "agent.message.delta",
    source: { component: "graph", agent },
    level: "info",
    payload: { kind, delta: text },
  };
}

function batch(sequence: number, kind: string, deltas: string[], agent = "researcher"): LiveActivityEvent {
  return {
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type: "agent.message.delta",
    source: { component: "graph", agent },
    level: "info",
    payload: { kind, deltas },
  };
}

function metrics(sequence: number): LiveActivityEvent {
  return {
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type: "stream.metrics",
    source: { component: "graph", agent: "researcher" },
    level: "info",
    payload: { model: "deepseek/v3", provider: "opengateway", ttft_ms: 180, tok_per_second: 42.5, output_tokens_estimate: 640, duration_ms: 15200 },
  };
}

function toolChunk(sequence: number, index: number, args: string): LiveActivityEvent {
  return {
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type: "model.tool_call.delta",
    source: { component: "graph", agent: "researcher" },
    level: "info",
    payload: { index, id: "call_1", name: "search_jobs", args },
  };
}

function completed(sequence: number, agent = "researcher"): ActivityEvent {
  return {
    database_id: sequence,
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type: "agent.turn.completed",
    source: { component: "graph", agent },
    level: "info",
    payload: { agent, text: "final", reasoning: "" },
  };
}

describe("mergeLive v2", () => {
  it("appends batched deltas and legacy single deltas", () => {
    const agents = mergeLive(
      [batch(1, "text", ["stream", "ing ", "mark"]), delta(4, "text", "down!")],
      new Map(),
    );
    expect(agents).toHaveLength(1);
    expect(agents[0].text).toBe("streaming markdown!");
    expect(agents[0].streaming).toBe(true);
  });

  it("separates reasoning and text", () => {
    const agents = mergeLive([delta(1, "reasoning", "think"), delta(2, "text", "answer")], new Map());
    expect(agents[0].reasoning).toBe("think");
    expect(agents[0].text).toBe("answer");
  });

  it("accumulates tool call argument chunks per index", () => {
    const agents = mergeLive([toolChunk(1, 0, "{\"q\":"), toolChunk(2, 0, "\"eng\"}")], new Map());
    const call = agents[0].toolCalls.get(0);
    expect(call).toBeDefined();
    expect(call?.name).toBe("search_jobs");
    expect(call?.args).toBe("{\"q\":\"eng\"}");
  });

  it("records live metrics on stream.metrics events", () => {
    const agents = mergeLive([metrics(1), delta(2, "text", "hi")], new Map());
    expect(agents[0].metrics).toEqual({
      model: "deepseek/v3",
      provider: "opengateway",
      ttftMs: 180,
      tokPerSecond: 42.5,
      outputTokens: 640,
      durationMs: 15200,
    });
  });

  it("drops deltas older than the agent's last turn boundary", () => {
    const boundaries = turnBoundaries([completed(10)]);
    const agents = mergeLive([delta(5, "text", "stale"), delta(11, "text", "fresh")], boundaries);
    expect(agents[0].text).toBe("fresh");
  });

  it("sorts agents by first sequence", () => {
    const agents = mergeLive(
      [delta(3, "text", "a", "agent-b"), delta(1, "text", "b", "agent-a")],
      new Map(),
    );
    expect(agents.map((agent) => agent.agent)).toEqual(["agent-a", "agent-b"]);
  });
});
