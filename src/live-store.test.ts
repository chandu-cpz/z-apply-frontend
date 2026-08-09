import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveStore } from "./live-store";
import type { LiveActivityEvent } from "./types";

function live(sequence: number, type = "agent.message.delta"): LiveActivityEvent {
  return {
    run_id: "run-1",
    sequence,
    occurred_at: "2026-07-14T10:00:00Z",
    type,
    source: { component: "graph", agent: "orchestrator" },
    level: "info",
    payload: { kind: "text", delta: `t${sequence}` },
  };
}

function committed(runId = "run-1"): LiveActivityEvent[] {
  return useLiveStore.getState().byRun[runId] ?? [];
}

describe("live store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useLiveStore.getState().clearRun("run-1");
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces pushes into one commit per animation frame", () => {
    const store = useLiveStore.getState();
    store.push(live(1));
    store.push(live(2));
    store.push(live(3));
    // No flush yet: rAF (setTimeout fallback in node) has not fired.
    expect(committed()).toEqual([]);
    vi.advanceTimersByTime(16);
    expect(committed().map((item) => item.sequence)).toEqual([1, 2, 3]);
  });

  it("drops events at or below the cursor (replay/live race guard)", () => {
    const store = useLiveStore.getState();
    store.push(live(3));
    store.push(live(1));
    store.push(live(3));
    vi.advanceTimersByTime(16);
    // The wire is monotonic (server honors Last-Event-ID); the store cursor is
    // belt-and-suspenders and drops anything at or below the latest sequence.
    expect(committed().map((item) => item.sequence)).toEqual([3]);
  });

  it("caps events per run and drops the oldest", () => {
    const store = useLiveStore.getState();
    for (let sequence = 1; sequence <= 610; sequence++) {
      store.push(live(sequence));
    }
    vi.advanceTimersByTime(16);
    const sequences = committed().map((item) => item.sequence);
    expect(sequences.length).toBe(600);
    expect(sequences[0]).toBe(11); // 610 - 600 + 1
    expect(sequences[sequences.length - 1]).toBe(610);
  });

  it("clears a run's pending and committed events", () => {
    const store = useLiveStore.getState();
    store.push(live(1));
    vi.advanceTimersByTime(16);
    expect(committed().length).toBe(1);
    store.clearRun("run-1");
    expect(committed()).toEqual([]);
  });
});
