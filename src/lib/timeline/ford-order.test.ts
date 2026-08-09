import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTimeline } from "./build";
import type { ActivityEvent } from "../../types";

function realEvents(): ActivityEvent[] {
  const lines = readFileSync("/tmp/ford-events.jsonl", "utf-8").trim().split("\n");
  return lines.map((line) => JSON.parse(line) as ActivityEvent);
}

function collectTurnSeqs(items: ReturnType<typeof buildTimeline>): number[] {
  const seqs: number[] = [];
  for (const item of items) {
    if (item.kind === "turn") seqs.push(item.item.seq);
    if (item.kind === "agent-segment") seqs.push(...collectTurnSeqs(item.items));
  }
  return seqs;
}

describe("buildTimeline with the real Ford run", () => {
  it("renders turns -> stall -> checkpoints in chronological order", () => {
    const events = realEvents();
    const items = buildTimeline(events);

    const humanAt = items.filter((item) => item.kind === "human");
    const stalls = items.filter((item) => item.kind === "stall");
    const lastTurnSeq = Math.max(...collectTurnSeqs(items));
    const firstHumanSeq = humanAt.length ? (humanAt[0].kind === "human" ? humanAt[0].seq : 0) : 0;

    // The stall must sit after the last turn and before the first checkpoint.
    if (stalls.length > 0) {
      const stallSeq = stalls[0].kind === "stall" ? stalls[0].seq : 0;
      expect(stallSeq).toBeGreaterThan(lastTurnSeq);
      expect(stallSeq).toBeLessThan(firstHumanSeq);
    }

    // All checkpoints after the last turn, in ascending sequence.
    const humanSeqs = humanAt
      .filter((item): item is Extract<(typeof items)[number], { kind: "human" }> => item.kind === "human")
      .map((item) => item.seq);
    for (const seq of humanSeqs) expect(seq).toBeGreaterThan(lastTurnSeq);
    expect([...humanSeqs].sort((a, b) => a - b)).toEqual(humanSeqs);

    // Debug print for the user's screenshot comparison.
    const debug = {
      lastTurnSeq,
      stall: stalls.map((s) => (s.kind === "stall" ? { seq: s.seq, calls: s.calls, seconds: s.seconds, at: s.occurredAt, end: s.endedAt } : null)),
      checkpoints: humanAt.map((h) =>
        h.kind === "human" ? { seq: h.seq, sub: h.sub, q: h.question, answer: h.answer ?? null, at: h.occurredAt } : null,
      ),
    };
    writeFileSync("/tmp/ford-order.json", JSON.stringify(debug, null, 1));
  });
});
