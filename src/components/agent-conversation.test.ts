import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "../types";
import { parallelBatches } from "../parallel-batches";

function taskStarted(databaseId: number, callId: string, sequence: number, fieldLabel: string, occurredAt: string): ActivityEvent {
  return {
    database_id: databaseId,
    run_id: "run-1",
    sequence,
    occurred_at: occurredAt,
    type: "tool.started",
    source: { component: "core" },
    level: "info",
    payload: {
      tool_name: "task",
      tool_call_id: callId,
      parent_tool_call_id: "call_orchestrator",
      agent_path: "orchestrator",
      model_id: "acme/answerwriter",
      event_seq: sequence,
      input: { description: `Resolve candidate field. CANDIDATE_FIELD_REQUEST ${JSON.stringify({ field_label: fieldLabel, reason: "needed" })}` },
    },
  };
}

function taskCompleted(databaseId: number, callId: string, sequence: number, occurredAt: string, completed = true, error?: string): ActivityEvent {
  return {
    database_id: databaseId,
    run_id: "run-1",
    sequence,
    occurred_at: occurredAt,
    type: "tool.completed",
    source: { component: "core" },
    level: "info",
    payload: { tool_name: "task", tool_call_id: callId, completed, ...(error !== undefined ? { error } : {}) },
  };
}

describe("parallelBatches", () => {
  it("does not batch sequential AnswerWriter delegations", () => {
    const events = [
      taskStarted(1, "call_1", 10, "Company name", "2026-07-14T10:00:00Z"),
      taskCompleted(2, "call_1", 11, "2026-07-14T10:00:01Z"),
      taskStarted(3, "call_2", 12, "Role title", "2026-07-14T10:00:02Z"),
      taskCompleted(4, "call_2", 13, "2026-07-14T10:00:03Z"),
    ];
    expect(parallelBatches(events)).toEqual([]);
  });

  it("batches overlapping AnswerWriter delegations", () => {
    const events = [
      taskStarted(1, "call_1", 10, "Company name", "2026-07-14T10:00:00Z"),
      taskStarted(2, "call_2", 11, "Role title", "2026-07-14T10:00:00Z"),
      taskStarted(3, "call_3", 12, "Location", "2026-07-14T10:00:00Z"),
      taskCompleted(4, "call_1", 13, "2026-07-14T10:00:05Z"),
      taskCompleted(5, "call_2", 14, "2026-07-14T10:00:06Z"),
      taskCompleted(6, "call_3", 15, "2026-07-14T10:00:07Z"),
    ];
    const batches = parallelBatches(events);
    expect(batches).toHaveLength(1);
    expect(batches[0].calls).toHaveLength(3);
    expect(batches[0].calls.map((call) => call.fieldLabel).sort()).toEqual(["Company name", "Location", "Role title"]);
  });

  it("treats an in-flight delegation as overlapping anything started after it", () => {
    const events = [
      taskStarted(1, "call_1", 10, "Company name", "2026-07-14T10:00:00Z"),
      taskStarted(2, "call_2", 11, "Role title", "2026-07-14T10:00:00Z"),
    ];
    const batches = parallelBatches(events);
    expect(batches).toHaveLength(1);
    expect(batches[0].calls).toHaveLength(2);
    expect(batches[0].calls.every((call) => !call.completed)).toBe(true);
  });

  it("marks a failed delegation inside a batch", () => {
    const events = [
      taskStarted(1, "call_1", 10, "Company name", "2026-07-14T10:00:00Z"),
      taskStarted(2, "call_2", 11, "Role title", "2026-07-14T10:00:00Z"),
      taskCompleted(3, "call_1", 12, "2026-07-14T10:00:02Z", true),
      taskCompleted(4, "call_2", 13, "2026-07-14T10:00:03Z", false, "rejected"),
    ];
    const batches = parallelBatches(events);
    expect(batches).toHaveLength(1);
    const failed = batches[0].calls.find((call) => call.toolCallId === "call_2");
    expect(failed?.failed).toBe(true);
    expect(failed?.error).toBe("rejected");
  });
});
