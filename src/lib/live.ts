import type { ActivityEvent, LiveActivityEvent } from "../types";
import { num, str } from "./format";

export interface LiveToolCall {
  index: number;
  id: string;
  name: string;
  args: string;
}

export interface LiveAgent {
  agent: string;
  firstSeq: number;
  occurredAt: string;
  reasoning: string;
  text: string;
  toolCalls: Map<number, LiveToolCall>;
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

export function mergeLive(live: LiveActivityEvent[], boundaryByAgent: Map<string, number>): LiveAgent[] {
  const agents = new Map<string, LiveAgent>();
  for (const event of live) {
    if (event.type !== "agent.message.delta" && event.type !== "model.tool_call.delta") continue;
    const agent = liveAgentOf(event.source, event.payload.agent);
    const boundary = boundaryByAgent.get(agent) ?? 0;
    if (event.sequence <= boundary) continue;
    let state = agents.get(agent);
    if (!state) {
      state = {
        agent,
        firstSeq: event.sequence,
        occurredAt: event.occurred_at,
        reasoning: "",
        text: "",
        toolCalls: new Map(),
        streaming: true,
      };
      agents.set(agent, state);
    }
    if (event.type === "agent.message.delta") {
      const kind = str(event.payload.kind);
      const delta = str(event.payload.delta);
      if (kind === "reasoning") state.reasoning += delta;
      else if (kind === "text") state.text += delta;
    } else if (event.type === "model.tool_call.delta") {
      const index = num(event.payload.index);
      const id = str(event.payload.id);
      const name = str(event.payload.name);
      const args = str(event.payload.args);
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
