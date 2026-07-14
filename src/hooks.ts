import { useEffect, useRef, useState } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { activityEventSchema } from "./schemas";
import type { ActivityEvent } from "./types";

const CURSOR_KEY = "z-apply:event-cursor";

/** EventSource does not support wildcard named events, so this list is the wire contract. */
export const STREAM_EVENT_TYPES = [
  "run.queued", "run.started", "run.phase_changed", "run.status_changed", "run.cancel_requested", "run.terminal", "run.interrupted",
  "run.start_failed", "agent.started", "agent.changed", "agent.completed", "agent.failed", "agent.message.delta",
  "model.selected", "model.failed", "model.retrying", "model.rate_limited", "model.rotated", "model.tool_call.delta",
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
    if (current.some((item) => item.database_id === event.database_id)) return current;
    return [...current, event].sort((left, right) => left.database_id - right.database_id);
  });
  if (event.type.startsWith("run.") || event.type.startsWith("browser.") || event.type.startsWith("model.")) {
    void client.invalidateQueries({ queryKey: ["runs"] });
    void client.invalidateQueries({ queryKey: ["run", event.run_id] });
  }
  if (event.type.startsWith("human.") || event.type.startsWith("submission.")) {
    void client.invalidateQueries({ queryKey: ["human", event.run_id] });
  }
  if (event.type === "artifact.created") void client.invalidateQueries({ queryKey: ["artifacts", event.run_id] });
  if (event.type.startsWith("browser.")) void client.invalidateQueries({ queryKey: ["live"] });
}
