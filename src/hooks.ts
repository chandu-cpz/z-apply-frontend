import { useEffect, useRef, useState } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { activityEventSchema, liveActivityEventSchema } from "./schemas";
import { useLiveStore } from "./live-store";
import { useSyncStore } from "./sync-store";
import type { ActivityEvent, LiveActivityEvent } from "./types";

const CURSOR_KEY = "z-apply:event-cursor";

/**
 * EventSource does not support wildcard named events, so this list is the wire
 * contract: every persisted event type the core emits (mirrors
 * z_apply_core.integrations.service._emit plus the backend-synthesized
 * run.interrupted/run.start_failed). Live-only deltas ride /events/live via
 * useLiveEventStream instead; model.call_started carries no renderable state.
 */
export const STREAM_EVENT_TYPES = [
  "run.queued", "run.started", "run.phase_changed", "run.cancel_requested", "run.terminal", "run.interrupted", "run.start_failed", "run.ledger",
  "agent.started", "agent.changed", "agent.completed", "agent.failed", "agent.turn.completed",
  "model.selected", "model.switched", "model.usage", "model.failed", "model.rate_limited", "model.rotated", "model.call.metrics", "model.call_completed",
  "tool.started", "tool.progress", "tool.completed", "tool.failed",
  "browser.page_opened", "browser.page_focused", "browser.page_closed", "browser.snapshot_refreshed", "browser.control_taken", "browser.control_returned", "browser.closed",
  "human.requested", "human.resolved", "human.cancelled",
  "submission.review_ready", "submission.review_not_ready", "submission.approval_requested", "submission.approved", "submission.rejected",
  "artifact.created", "authentication.evidence", "graph.event", "recovery.started", "recovery.completed", "recovery.exhausted", "context.received", "reasoning.updated",
] as const;

export type StreamStatus = "connecting" | "connected" | "reconnecting";

function useNamedEventSource(
  url: string,
  types: readonly string[],
  receive: (msg: MessageEvent<string>) => void,
  onOpen?: () => void,
  onReset?: (msg: MessageEvent<string>) => void,
): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  // Latest-ref pattern: callers pass inline closures, so `receive` changes
  // identity every render. The connection effect must not depend on it or
  // every parent render would tear down and reopen the EventSource.
  const receiveRef = useRef(receive);
  const openRef = useRef(onOpen);
  const resetRef = useRef(onReset);
  useEffect(() => {
    receiveRef.current = receive;
    openRef.current = onOpen;
    resetRef.current = onReset;
  });
  useEffect(() => {
    const source = new EventSource(url);
    const dispatch = (msg: Event) => receiveRef.current(msg as MessageEvent<string>);
    source.onopen = () => {
      setStatus("connected");
      openRef.current?.();
    };
    source.onerror = () => setStatus("reconnecting");
    source.onmessage = dispatch;
    for (const type of types) {
      source.addEventListener(type, dispatch);
    }
    source.addEventListener("cursor.reset", (msg) => resetRef.current?.(msg as MessageEvent<string>));    return () => source.close();
  }, [url, types]);
  return status;
}

export function useEventStream(): StreamStatus {
  const client = useQueryClient();
  // Seed the stream start cursor from localStorage exactly once. Read during
  // render via a lazy state initializer (never a ref: refs may only be
  // touched from handlers/effects); re-seeding on later renders could roll
  // the in-memory cursor back while a throttled flush is still pending.
  const [initialCursor] = useState(() => {
    const stored = Number.parseInt(localStorage.getItem(CURSOR_KEY) ?? "0", 10);
    return Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
  });
  const cursor = useRef(initialCursor);
  // Throttle localStorage writes to avoid per-event main-thread churn and cross-tab clobber
  const flushTimer = useRef<number | null>(null);
  const hasConnected = useRef(false);
  useEffect(
    () => () => {
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    },
    [],
  );
  const scheduleFlush = (id: number) => {
    cursor.current = Math.max(cursor.current, id);
    if (flushTimer.current !== null) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      localStorage.setItem(CURSOR_KEY, String(cursor.current));
    }, 500);
  };
  return useNamedEventSource(
    `/api/v1/events/stream?after=${initialCursor}`,
    STREAM_EVENT_TYPES,
    (message) => {
      const event = parseStreamEvent(message.data);
      if (!event) return;
      applyEvent(client, event);
      scheduleFlush(event.database_id);
    },
    () => {
      // Reconnect reconciliation: the server replays from Last-Event-ID, but
      // its replay window can sit below our watermark (cursor semantics may
      // shift across backend restarts without a cursor.reset), so drop the
      // watermark and let the replay re-patch state instead of being silently
      // discarded as "already applied". Invalidate the fetched queries too:
      // events missed while offline leave non-run data stale. Skipped on the
      // initial connect, where bootstrap queries just fetched.
      if (!hasConnected.current) {
        hasConnected.current = true;
        return;
      }
      useSyncStore.setState({ lastAppliedId: 0 });
      void client.invalidateQueries({ queryKey: ["runs"] });
      void client.invalidateQueries({ queryKey: ["live"] });
      void client.invalidateQueries({ queryKey: ["calls"] });
      void client.invalidateQueries({ queryKey: ["run-artifacts"] });
    },
    () => {
      // The stored cursor outlived the database (reset/restore): the server
      // wiped its replay cursor and is resending history from id 0. Drop the
      // local cursor and the store watermark so the replay patches state
      // instead of being discarded as "already applied".
      localStorage.removeItem(CURSOR_KEY);
      useSyncStore.setState({ lastAppliedId: 0 });
    },
  );
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
  // State patches flow through the sync store; no invalidate-and-refetch.
  useSyncStore.getState().applyEvent(event);
  // The live view is fetched data (VNC target), not run state: refetch it when
  // the browser topology changes. Every browser event except
  // snapshot_refreshed (excerpt-only) is a topology change, and all are rare.
  if (event.type.startsWith("browser.") && event.type !== "browser.snapshot_refreshed") {
    void client.invalidateQueries({ queryKey: ["live"] });
  }
  // run.ledger lands once per run with the final call totals; one refetch
  // makes RunStats/CallsDrawer show them without polling a terminal run.
  if (event.type === "run.ledger") {
    void client.invalidateQueries({ queryKey: ["calls", event.run_id] });
  }
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
  return useNamedEventSource("/api/v1/events/live", LIVE_STREAM_EVENT_TYPES, (message) => {
    const event = parseLiveEvent(message.data);
    if (!event) return;
    useLiveStore.getState().push(event);
  });
}
