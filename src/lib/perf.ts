import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActivityEvent } from "../types";

export interface ModelPerfSummary {
  model: string;
  calls: number;
  avgTtftMs: number;
  avgTokPerSecond: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastDurationMs: number;
}

interface ModelPerfAccumulator {
  model: string;
  calls: number;
  totalTtftMs: number;
  totalTokensPerSecond: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  lastDurationMs: number;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function aggregateModelPerformance(events: ActivityEvent[], runId: string): ModelPerfSummary[] {
  const byModel = new Map<string, ModelPerfAccumulator>();
  for (const event of events) {
    if (event.run_id !== runId || event.type !== "model.usage") continue;
    const payload = event.payload ?? {};
    const model = typeof payload.model === "string" && payload.model ? payload.model : "unknown";
    const acc = byModel.get(model) ?? {
      model,
      calls: 0,
      totalTtftMs: 0,
      totalTokensPerSecond: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastDurationMs: 0,
    };
    acc.calls += 1;
    acc.totalTtftMs += num(payload.ttft_ms);
    acc.totalTokensPerSecond += num(payload.tok_per_second);
    acc.totalInputTokens += num(payload.input_tokens);
    acc.totalOutputTokens += num(payload.output_tokens);
    acc.lastDurationMs = num(payload.duration_ms);
    byModel.set(model, acc);
  }
  return [...byModel.values()].map((acc) => ({
    model: acc.model,
    calls: acc.calls,
    avgTtftMs: acc.calls ? acc.totalTtftMs / acc.calls : 0,
    avgTokPerSecond: acc.calls ? acc.totalTokensPerSecond / acc.calls : 0,
    totalInputTokens: acc.totalInputTokens,
    totalOutputTokens: acc.totalOutputTokens,
    lastDurationMs: acc.lastDurationMs,
  }));
}

export function useModelPerformance(runId: string): ModelPerfSummary[] {
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["model-perf", runId],
    queryFn: () => client.getQueryData<ActivityEvent[]>(["events", runId]) ?? [],
    refetchInterval: 2_000,
  });
  return useMemo(() => aggregateModelPerformance(data ?? [], runId), [data, runId]);
}
