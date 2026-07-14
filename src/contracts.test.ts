import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { applyEvent, parseStreamEvent } from "./hooks";
import { hrefFor, parseRoute } from "./routes";
import { humanRequestSchema, liveViewSchema } from "./schemas";
import type { ActivityEvent } from "./types";

function event(databaseId: number, sequence = databaseId): ActivityEvent {
  return {
    database_id: databaseId,
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type: "tool.completed",
    source: { component: "core" },
    level: "info",
    payload: { summary: "Recorded evidence" },
  };
}

describe("frontend transport contracts", () => {
  it("round-trips durable run URLs", () => {
    const route = parseRoute("/runs/6d62d46a-3e48-4ac4-a77c-361591a4ef18");
    expect(route).toEqual({ name: "run", runId: "6d62d46a-3e48-4ac4-a77c-361591a4ef18" });
    expect(hrefFor(route)).toBe("/runs/6d62d46a-3e48-4ac4-a77c-361591a4ef18");
    expect(parseRoute("/artifacts")).toEqual({ name: "artifacts" });
  });

  it("rejects malformed SSE payloads instead of poisoning the cache", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(parseStreamEvent("not-json")).toBeUndefined();
    expect(parseStreamEvent(JSON.stringify({ type: "run.started" }))).toBeUndefined();
    expect(parseStreamEvent(JSON.stringify(event(3)))).toEqual(event(3));
    warning.mockRestore();
  });

  it("deduplicates streamed events by database id and keeps replay order", () => {
    const client = new QueryClient();
    applyEvent(client, event(4));
    applyEvent(client, event(2));
    applyEvent(client, event(4));
    expect(client.getQueryData<ActivityEvent[]>(["events", "run-1"])?.map((item) => item.database_id)).toEqual([2, 4]);
  });

  it("preserves HITL options and browser control ownership", () => {
    const request = humanRequestSchema.parse({ request_id: "request-1", kind: "missing_fact", question: "Available to join?", context: "", options: ["0", "30", "60"], risk: "low", allow_free_text: false, status: "pending" });
    expect(request.options).toEqual(["0", "30", "60"]);
    expect(request.allow_free_text).toBe(false);
    expect(liveViewSchema.parse({ available: true, websocket_url: "ws://localhost/view", control_mode: "human_control", focused_run_id: "run-1" }).focused_run_id).toBe("run-1");
  });
});
