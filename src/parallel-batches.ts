import type { ActivityEvent } from "./types";

export interface ParallelCall { toolCallId: string; fieldLabel: string; startedSeq: number; completedSeq: number | null; completed: boolean; failed: boolean; error?: string; modelId?: string; startedAt: string; completedAt: string | null; }
export interface ParallelBatch { id: string; calls: ParallelCall[]; startedAt: string; completedAt: string; }

export function parallelBatches(events: ActivityEvent[]): ParallelBatch[] {
  const byCallId = new Map<string, ParallelCall>();
  for (const event of events) {
    if ((event.type !== "tool.started" && event.type !== "tool.completed") || event.payload.tool_name !== "task") continue;
    const toolCallId = typeof event.payload.tool_call_id === "string" ? event.payload.tool_call_id : "";
    if (!toolCallId) continue;
    let call = byCallId.get(toolCallId);
    if (!call) {
      call = { toolCallId, fieldLabel: "", startedSeq: Number.POSITIVE_INFINITY, completedSeq: null, completed: false, failed: false, startedAt: event.occurred_at, completedAt: null };
      byCallId.set(toolCallId, call);
    }
    if (event.type === "tool.started") {
      call.startedSeq = Math.min(call.startedSeq, event.sequence);
      call.startedAt = call.startedAt <= event.occurred_at ? call.startedAt : event.occurred_at;
      if (typeof event.payload.model_id === "string") call.modelId = event.payload.model_id;
      const input = typeof event.payload.input === "object" && event.payload.input !== null && !Array.isArray(event.payload.input) ? event.payload.input as Record<string, unknown> : undefined;
      const description = input && typeof input.description === "string" ? input.description : undefined;
      if (description && !call.fieldLabel) call.fieldLabel = fieldLabelFromRequest(description);
    } else {
      call.completedSeq = event.sequence;
      call.completedAt = event.occurred_at;
      call.failed = event.payload.completed === false || typeof event.payload.error === "string";
      call.completed = !call.failed;
      if (typeof event.payload.error === "string") call.error = event.payload.error;
    }
  }
  const ordered = Array.from(byCallId.values()).filter((call) => Number.isFinite(call.startedSeq)).sort((left, right) => left.startedSeq - right.startedSeq);
  const batches: ParallelBatch[] = [];
  for (const call of ordered) {
    const current = batches.at(-1);
    if (current && overlapsAny(current.calls, call)) {
      current.calls.push(call);
      current.completedAt = maxTime(current.completedAt, call.completedAt);
    } else {
      batches.push({ id: "", calls: [call], startedAt: call.startedAt, completedAt: call.completedAt ?? call.startedAt });
    }
  }
  return batches.filter((batch) => batch.calls.length >= 2).map((batch) => ({ ...batch, id: batch.calls.map((call) => call.toolCallId).join("+") }));
}

function overlapsAny(calls: ParallelCall[], candidate: ParallelCall): boolean {
  return calls.some((call) => candidate.startedSeq < (call.completedSeq ?? Number.POSITIVE_INFINITY) && call.startedSeq < (candidate.completedSeq ?? Number.POSITIVE_INFINITY));
}
function maxTime(left: string | null, right: string | null): string { if (!left) return right ?? ""; if (!right) return left; return left > right ? left : right; }
function fieldLabelFromRequest(description: string): string {
  const quoted = description.match(/"field_label"\s*:\s*"([^"]+)"/);
  if (quoted) return quoted[1];
  const marker = description.indexOf("CANDIDATE_FIELD_REQUEST");
  if (marker >= 0) {
    const tail = description.slice(marker);
    const open = tail.indexOf("{");
    const close = tail.lastIndexOf("}");
    if (open >= 0 && close > open) {
      try {
        const parsed = JSON.parse(tail.slice(open, close + 1)) as Record<string, unknown>;
        if (typeof parsed.field_label === "string") return parsed.field_label;
      } catch { return ""; }
    }
  }
  return "";
}
