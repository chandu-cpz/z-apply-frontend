import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ActivityEvent, Artifact, Run } from "./types";
import { artifactSchema, runSchema } from "./schemas";

/**
 * Server-state store patched directly from the SSE stream. Every persisted
 * event carries a `view` snapshot of the run taken after the mutation that
 * triggered it, so the client renders from local state and REST shrinks to
 * bootstrap-on-mount plus commands. Patches apply in monotonic `database_id`
 * order; late or replayed events at or below the watermark are dropped.
 */

interface SyncStore {
  runs: Record<string, Run>;
  artifactsByRun: Record<string, Artifact[]>;
  lastAppliedId: number;
  applyEvent(event: ActivityEvent): void;
  seedRuns(runs: Run[]): void;
  seedRun(run: Run): void;
  seedArtifacts(runId: string, artifacts: Artifact[]): void;
}

function runFromView(view: Record<string, unknown> | undefined): Run | undefined {
  if (!view) return undefined;
  const parsed = runSchema.safeParse({
    id: view.run_id,
    job_url: view.job_url,
    task: view.task ?? "",
    company: view.company ?? null,
    role: view.role ?? null,
    status: view.status,
    phase: view.phase,
    outcome: view.outcome ?? null,
    summary: view.summary ?? null,
    current_agent: view.current_agent ?? null,
    current_model: view.current_model ?? null,
    current_provider: view.current_provider ?? null,
    browser_tab_state: view.browser_tab_state,
    latest_run_sequence: view.latest_event_sequence ?? 0,
    created_at: view.created_at,
    started_at: view.started_at ?? null,
    finished_at: view.finished_at ?? null,
    current_reasoning: view.current_reasoning ?? "auto",
    current_reasoning_effort: view.current_reasoning_effort ?? null,
  });
  return parsed.success ? parsed.data : undefined;
}

function artifactFromEvent(event: ActivityEvent): Artifact | undefined {
  const parsed = artifactSchema.safeParse({ run_id: event.run_id, ...event.payload });
  return parsed.success ? parsed.data : undefined;
}

export const useSyncStore = create<SyncStore>((set) => ({
  runs: {},
  artifactsByRun: {},
  lastAppliedId: 0,

  applyEvent: (event) => {
    if (event.database_id <= useSyncStore.getState().lastAppliedId) return;
    const run = runFromView(event.payload.view as Record<string, unknown> | undefined);
    const artifact = event.type === "artifact.created" ? artifactFromEvent(event) : undefined;
    set((state) => {
      const next: Partial<SyncStore> = { lastAppliedId: event.database_id };
      if (run) next.runs = { ...state.runs, [run.id]: run };
      if (artifact) {
        const current = state.artifactsByRun[artifact.run_id] ?? [];
        if (!current.some((item) => item.artifact_id === artifact.artifact_id)) {
          next.artifactsByRun = {
            ...state.artifactsByRun,
            [artifact.run_id]: [...current, artifact],
          };
        }
      }
      return next;
    });
  },

  seedRuns: (runs) =>
    set((state) => {
      const next = { ...state.runs };
      for (const run of runs) next[run.id] = fresher(state.runs[run.id], run);
      return { runs: next };
    }),

  seedRun: (run) =>
    set((state) => ({ runs: { ...state.runs, [run.id]: fresher(state.runs[run.id], run) } })),

  seedArtifacts: (runId, artifacts) =>
    set((state) => ({
      artifactsByRun: {
        ...state.artifactsByRun,
        [runId]: mergeArtifacts(state.artifactsByRun[runId], artifacts),
      },
    })),
}));

function mergeArtifacts(current: Artifact[] | undefined, incoming: Artifact[]): Artifact[] {
  const byId = new Map((current ?? []).map((item) => [item.artifact_id, item]));
  for (const item of incoming) byId.set(item.artifact_id, item);
  return [...byId.values()];
}

/**
 * Keep whichever copy of a run is further along. REST responses can land
 * after stream events that already patched the store; without this guard a
 * late bootstrap would roll a run back until its next event arrived.
 *
 * Terminal is absorbing: nothing mutates a run after it ends, and sequence
 * numbers from different sources sit on different clocks (live-only deltas
 * inflate the REST-serialized counter while backend-synthesized restart rows
 * renumber from the persisted one), so an incoming terminal always wins even
 * with a lower sequence.
 */
function fresher(current: Run | undefined, incoming: Run): Run {
  if (!current || incoming.status === "terminal") return incoming;
  if (current.status === "terminal") return current;
  return current.latest_run_sequence > incoming.latest_run_sequence ? current : incoming;
}

/** Single read path for run state: components never read runs from React Query. */
export function useRun(runId: string): Run | undefined {
  return useSyncStore((state) => state.runs[runId]);
}

/** Newest-first, matching the REST bootstrap ordering. */
export function useRuns(): Run[] {
  return useSyncStore(
    useShallow((state) =>
      Object.values(state.runs).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    ),
  );
}

export function useArtifacts(runId: string): Artifact[] {
  return useSyncStore(useShallow((state) => state.artifactsByRun[runId] ?? []));
}
