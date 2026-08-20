import type { ActivityEvent } from "../types";
import { str } from "./format";

/**
 * Single source for extracting an agent label from an event source/payload.
 * Both durable timeline events and live streaming events use this.
 *
 * - `source.agent` is preferred (orchestrator, AnswerWriter, etc.)
 * - `source.name` is the live-stream alias
 * - `payloadAgent` is `payload.agent` string form
 * - `fallback` differs per caller (timeline uses "core", live uses "orchestrator")
 * - Labels like "orchestrator:123" are normalized to "orchestrator"
 */
export function getAgentLabel(
  source: Record<string, string | undefined> | undefined,
  payloadAgent: unknown,
  fallback = "core",
): string {
  const candidate = source?.agent || source?.name || str(payloadAgent) || fallback;
  if (!candidate) return fallback;
  return candidate.split(":", 1)[0];
}

/** Timeline helper — durable events carry `source` + `payload.agent`. */
export function agentOf(event: Pick<ActivityEvent, "source" | "payload">): string {
  return getAgentLabel(event.source as Record<string, string | undefined>, (event.payload as Record<string, unknown>)?.agent, "core");
}

/** Live helper — streaming events carry `source` + optional fallback agent. */
export function liveAgentOf(source: Record<string, string>, fallback?: unknown): string {
  return getAgentLabel(source as Record<string, string | undefined>, fallback, "orchestrator");
}
