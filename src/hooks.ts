import { useEffect, useRef, useState } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { activityEventSchema, liveActivityEventSchema } from "./schemas";
import { useLiveStore } from "./live-store";
import type { ActivityEvent, LiveActivityEvent } from "./types";

const CURSOR_KEY = "z-apply:event-cursor";

/** EventSource does not support wildcard named events, so this list is the wire contract. */
export const STREAM_EVENT_TYPES = [
  "run.queued", "run.started", "run.phase_changed", "run.status_changed", "run.cancel_requested", "run.terminal", "run.interrupted",
  "run.start_failed", "agent.started", "agent.changed", "agent.completed", "agent.turn.completed", "agent.failed", "agent.message.delta",
  "model.selected", "model.usage", "model.failed", "model.retrying", "model.rate_limited", "model.rotated", "model.tool_call.delta",
  "tool.started", "tool.progress", "tool.completed", "tool.failed", "tool.denied",
  "browser.opened", "browser.focused", "browser.action_started", "browser.action_completed", "browser.action_failed",
  "browser.page_opened", "browser.page_focused", "browser.page_closed", "browser.snapshot_refreshed",
  "browser.control_taken", "browser.control_returned", "browser.closed", "browser.page_lost",
  "human.requested", "human.resolved", "human.cancelled",
  "submission.review_ready", "submission.review_not_ready", "submission.approval_requested", "submission.approved", "submission.rejected", "submission.started", "submission.verified",
  "artifact.created", "authentication.evidence", "graph.event", "recovery.started", "recovery.completed", "recovery.failed", "recovery.exhausted", "context.received", "warning", "error",
] as const;

export type StreamStatus = "connecting" | "connected" | "reconnecting";

export function useEventStream(): StreamStatus {
  const client = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const cursor = useRef(0);
  useEffect(() => {
    const stored = Number.parseInt(localStorage.getItem(CURSOR_KEY) ?? "0", 10);
    cursor.current = Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
    const source = new EventSource(`/api/v1/events/stream?after=${cursor.current}`);
    source.onopen = () => setStatus("connected");
    source.onerror = () => setStatus("reconnecting");
    const receive = (message: MessageEvent<string>) => {
      const event = parseStreamEvent(message.data);
      if (!event) return;
      applyEvent(client, event);
      cursor.current = Math.max(cursor.current, event.database_id);
      localStorage.setItem(CURSOR_KEY, String(cursor.current));
    };
    source.onmessage = receive;
    for (const type of STREAM_EVENT_TYPES) {
      source.addEventListener(type, (message) => receive(message as MessageEvent<string>));
    }
    return () => source.close();
  }, [client]);
  return status;
}

export function parseStreamEvent(data: string): ActivityEvent | undefined {
  try {
    const parsed = activityEventSchema.safeParse(JSON.parse(data));
    if (!parsed.success) {
      console.warn("Discarded invalid Z-Apply event", parsed.error.issues);
      return undefined;
    }
    return parsed.data;
  } catch {
    console.warn("Discarded non-JSON Z-Apply event");
    return undefined;
  }
}

export function applyEvent(client: QueryClient, event: ActivityEvent): void {
  client.setQueryData<ActivityEvent[]>(["events", event.run_id], (current = []) => {
    const last = current.length ? current[current.length - 1] : undefined;
    if (last !== undefined && event.database_id <= last.database_id) {
      let lo = 0;
      let hi = current.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const id = current[mid].database_id;
        if (id === event.database_id) return current;
        if (id < event.database_id) lo = mid + 1;
        else hi = mid - 1;
      }
      return [...current.slice(0, lo), event, ...current.slice(lo)];
    }
    return [...current, event];
  });
  if (event.type.startsWith("run.") || event.type.startsWith("browser.")) {
    void client.invalidateQueries({ queryKey: ["runs"] });
    void client.invalidateQueries({ queryKey: ["run", event.run_id] });
  }
  if (event.type === "model.selected" || event.type === "model.rotated") {
    void client.invalidateQueries({ queryKey: ["run", event.run_id] });
  }
  if (event.type.startsWith("human.") || event.type.startsWith("submission.")) {
    void client.invalidateQueries({ queryKey: ["human", event.run_id] });
  }
  if (event.type === "artifact.created") void client.invalidateQueries({ queryKey: ["artifacts", event.run_id] });
  if (event.type.startsWith("browser.")) void client.invalidateQueries({ queryKey: ["live"] });
}

export function parseLiveEvent(data: string): LiveActivityEvent | undefined {
  try {
    const parsed = liveActivityEventSchema.safeParse(JSON.parse(data));
    if (!parsed.success) {
      console.warn("Discarded invalid Z-Apply live event", parsed.error.issues);
      return undefined;
    }
    return parsed.data;
  } catch {
    console.warn("Discarded non-JSON Z-Apply live event");
    return undefined;
  }
}

/** Live-only types delivered as named SSE events. The wire always sends `event: <type>`, so without these listeners nothing reaches onmessage. */
const LIVE_STREAM_EVENT_TYPES = ["agent.message.delta", "model.tool_call.delta"] as const;

export function useLiveEventStream(): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  useEffect(() => {
    const source = new EventSource("/api/v1/events/live");
    const receive = (message: MessageEvent<string>) => {
      const event = parseLiveEvent(message.data);
      if (!event) return;
      useLiveStore.getState().push(event);
    };
    source.onopen = () => setStatus("connected");
    source.onerror = () => setStatus("reconnecting");
    source.onmessage = receive;
    for (const type of LIVE_STREAM_EVENT_TYPES) {
      source.addEventListener(type, receive);
    }
    return () => source.close();
  }, []);
  return status;
}
