import type { ActivityEvent, LiveActivityEvent } from "../types";
import { num, str } from "./format";

export interface LiveToolCall {
  index: number;
  id: string;
  name: string;
  args: string;
}

export interface LiveMetrics {
  model: string;
  provider: string;
  ttftMs: number;
  tokPerSecond: number;
  outputTokens: number;
  durationMs: number;
}

export interface LiveAgent {
  agent: string;
  firstSeq: number;
  occurredAt: string;
  reasoning: string;
  text: string;
  toolCalls: Map<number, LiveToolCall>;
  metrics?: LiveMetrics;
  streaming: boolean;
}

export const EMPTY_LIVELY: LiveActivityEvent[] = [];

export function liveAgentOf(source: Record<string, string>, fallback?: unknown): string {
  const candidate = source.agent || source.name || str(fallback);
  if (!candidate) return "orchestrator";
  return candidate.split(":", 1)[0];
}

export function turnBoundaries(events: ActivityEvent[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "agent.turn.completed") continue;
    const agent = liveAgentOf(event.source, event.payload.agent);
    map.set(agent, Math.max(map.get(agent) ?? 0, event.sequence));
  }
  return map;
}

function newLiveAgent(agent: string, event: LiveActivityEvent): LiveAgent {
  return {
    agent,
    firstSeq: event.sequence,
    occurredAt: event.occurred_at,
    reasoning: "",
    text: "",
    toolCalls: new Map(),
    streaming: true,
  };
}

/** Wire v2 batched shape: payload.deltas: string[] (or args_deltas for tool
 * call argument chunks). Legacy per-chunk shape (payload.delta / .args) is
 * still accepted so old and new core versions interop. */
function deltaText(payload: Record<string, unknown>): string {
  const deltas = payload.deltas;
  if (Array.isArray(deltas)) return deltas.map(str).join("");
  return str(payload.delta);
}

function toolArgsText(payload: Record<string, unknown>): string {
  const deltas = payload.args_deltas;
  if (Array.isArray(deltas)) return deltas.map(str).join("");
  return str(payload.args);
}

export function mergeLive(live: LiveActivityEvent[], boundaryByAgent: Map<string, number>): LiveAgent[] {
  const agents = new Map<string, LiveAgent>();
  for (const event of live) {
    const agent = liveAgentOf(event.source, event.payload.agent);
    const boundary = boundaryByAgent.get(agent) ?? 0;
    if (event.sequence <= boundary) continue;

    if (event.type === "stream.metrics") {
      const state = agents.get(agent) ?? newLiveAgent(agent, event);
      agents.set(agent, state);
      const payload = event.payload;
      state.metrics = {
        model: str(payload.model) || state.metrics?.model || "",
        provider: str(payload.provider) || state.metrics?.provider || "",
        ttftMs: num(payload.ttft_ms) || state.metrics?.ttftMs || 0,
        tokPerSecond: num(payload.tok_per_second) || state.metrics?.tokPerSecond || 0,
        outputTokens: num(payload.output_tokens_estimate) || state.metrics?.outputTokens || 0,
        durationMs: num(payload.duration_ms) || state.metrics?.durationMs || 0,
      };
      continue;
    }

    if (event.type !== "agent.message.delta" && event.type !== "model.tool_call.delta") continue;
    let state = agents.get(agent);
    if (!state) {
      state = newLiveAgent(agent, event);
      agents.set(agent, state);
    }
    if (event.type === "agent.message.delta") {
      const kind = str(event.payload.kind);
      const delta = deltaText(event.payload);
      if (kind === "reasoning") state.reasoning += delta;
      else if (kind === "text") state.text += delta;
    } else if (event.type === "model.tool_call.delta") {
      const index = num(event.payload.index);
      const id = str(event.payload.id);
      const name = str(event.payload.name);
      const args = toolArgsText(event.payload);
      const prior = state.toolCalls.get(index);
      state.toolCalls.set(index, {
        index,
        id: prior?.id || id,
        name: prior?.name || name,
        args: (prior?.args || "") + args,
      });
    }
    state.streaming = true;
  }
  return [...agents.values()].sort((left, right) => left.firstSeq - right.firstSeq);
}
