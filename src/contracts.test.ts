import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { applyEvent, parseStreamEvent } from "./hooks";
import { humanRequestSchema, liveViewSchema, runSchema } from "./schemas";
import { runAttentionLabel } from "./lib/format";
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

  it("accepts a live view with no browser workspace (backend sends null url)", () => {
    // browser.py serializes "websocket_url": null whenever the workspace is
    // offline; the schema must not reject the whole payload for it.
    const view = liveViewSchema.parse({ available: false, websocket_url: null, vnc_host: null, vnc_port: null, control_mode: "agent_control", focused_run_id: null });
    expect(view.available).toBe(false);
    expect(view.websocket_url).toBeNull();
  });

  it("keeps backend control truth on run payloads", () => {
    const run = runSchema.parse({ id: "run-1", job_url: "https://acme.com/jobs/1", task: "", company: null, role: null, status: "waiting_human", phase: "awaiting_approval", outcome: null, summary: null, current_agent: null, current_model: null, current_provider: null, browser_tab_state: "open", control_mode: "human_control", pending_human_request_id: "req-9", latest_run_sequence: 3, created_at: "2026-01-01T00:00:00Z", started_at: null, finished_at: null });
    expect(run.control_mode).toBe("human_control");
    expect(run.pending_human_request_id).toBe("req-9");
  });

  it("builds a safe run-attention label (company > role > hostname)", () => {
    expect(runAttentionLabel({ company: "Acme", role: null, job_url: "https://acme.com/jobs/1" })).toBe("Acme");
    expect(runAttentionLabel({ company: null, role: "Engineer", job_url: "https://acme.com/jobs/1" })).toBe("Engineer");
    expect(runAttentionLabel({ company: null, role: null, job_url: "https://www.workable.com/jobs/x" })).toBe("workable.com");
    expect(runAttentionLabel({ company: null, role: null, job_url: "not-a-url" })).toBe("Application");
  });
});
