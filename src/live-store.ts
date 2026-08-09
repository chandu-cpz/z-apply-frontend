import { create } from "zustand";
import type { LiveActivityEvent } from "./types";

const MAX_EVENTS_PER_RUN = 600;
const MAX_PENDING = 2000;

interface LiveStore {
  byRun: Record<string, LiveActivityEvent[]>;
  lastSeqByRun: Record<string, number>;
  push: (event: LiveActivityEvent) => void;
  clearRun: (runId: string) => void;
}

let pending: LiveActivityEvent[] = [];
let rafId: ReturnType<typeof setTimeout> | null = null;

type SetState = (updater: (state: LiveStore) => Partial<LiveStore>) => void;

/** One store commit per animation frame at most: token deltas arrive far
 * faster than the display can paint, and committing per event would trigger
 * hundreds of re-renders per second (see Chrome's "Best practices to render
 * streamed LLM responses"). rAF also naturally pauses in hidden tabs. */
function frame(callback: () => void): ReturnType<typeof setTimeout> {
  return typeof requestAnimationFrame === "function"
    ? (requestAnimationFrame(callback) as unknown as ReturnType<typeof setTimeout>)
    : setTimeout(callback, 16);
}

function flush(set: SetState): void {
  rafId = null;
  if (pending.length === 0) return;
  const batch = pending;
  pending = [];
  set((state) => {
    const byRun = { ...state.byRun };
    const lastSeqByRun = { ...state.lastSeqByRun };
    for (const event of batch) {
      const last = lastSeqByRun[event.run_id] ?? -1;
      if (event.sequence <= last) continue;
      const current = byRun[event.run_id] ?? [];
      byRun[event.run_id] = current.length >= MAX_EVENTS_PER_RUN
        ? [...current.slice(-(MAX_EVENTS_PER_RUN - 1)), event]
        : [...current, event];
      lastSeqByRun[event.run_id] = event.sequence;
    }
    return { byRun, lastSeqByRun };
  });
}

function scheduleFlush(set: SetState): void {
  if (rafId !== null) return;
  rafId = frame(() => flush(set));
}

export const useLiveStore = create<LiveStore>((set) => ({
  byRun: {},
  lastSeqByRun: {},
  push: (event) => {
    pending.push(event);
    if (pending.length > MAX_PENDING) {
      // Hidden-tab safety: rAF does not fire in background tabs, so bound the
      // pending queue and drop the oldest deltas (tokens are ephemeral; the
      // durable turn text repairs the UI on the next turn boundary).
      pending.splice(0, pending.length - MAX_PENDING);
    }
    scheduleFlush(set);
  },
  clearRun: (runId) => {
    pending = pending.filter((event) => event.run_id !== runId);
    set((state) => {
      const next = { ...state.byRun };
      delete next[runId];
      const nextSeq = { ...state.lastSeqByRun };
      delete nextSeq[runId];
      return { byRun: next, lastSeqByRun: nextSeq };
    });
  },
}));

export function selectLiveEvents(runId: string) {
  return (state: LiveStore) => state.byRun[runId] ?? [];
}
