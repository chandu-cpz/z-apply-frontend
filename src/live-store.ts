import { create } from "zustand";
import type { LiveActivityEvent } from "./types";

const FLUSH_MS = 80;
const MAX_EVENTS_PER_RUN = 600;

interface LiveStore {
  byRun: Record<string, LiveActivityEvent[]>;
  lastSeqByRun: Record<string, number>;
  push: (event: LiveActivityEvent) => void;
  clearRun: (runId: string) => void;
}

let pending: LiveActivityEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

type SetState = (updater: (state: LiveStore) => Partial<LiveStore>) => void;

function flush(set: SetState): void {
  flushTimer = null;
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

export const useLiveStore = create<LiveStore>((set) => ({
  byRun: {},
  lastSeqByRun: {},
  push: (event) => {
    pending.push(event);
    if (flushTimer === null) {
      flushTimer = setTimeout(() => flush(set), FLUSH_MS);
    }
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
