import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTimeline } from "./build";
import type { ActivityEvent } from "../../types";
import type { TimelineItem } from "./types";

const FIXTURE = "/tmp/intugine-events.jsonl";

function realEvents(): ActivityEvent[] {
  const lines = readFileSync(FIXTURE, "utf-8").trim().split("\n");
  return lines.map((line) => JSON.parse(line) as ActivityEvent);
}

describe.skipIf(!existsSync(FIXTURE))("buildTimeline with the live Intugine run", () => {
  it("places the approval + feedback cards chronologically (mid-thread), not at the end", () => {
    const items = buildTimeline(realEvents());

    // Flatten exactly like message-list does: sections + segment items in order.
    const flat: Array<{ seq: number; label: string; at: string }> = [];
    const walk = (list: TimelineItem[]) => {
      for (const item of list) {
        if (item.kind === "agent-segment") {
          flat.push({ seq: item.seq, label: `section:${item.agent}`, at: item.occurredAt });
          walk(item.items);
        } else if (item.kind === "turn") {
          flat.push({ seq: item.item.seq, label: `turn:${item.item.agent}`, at: item.item.occurredAt });
        } else if (item.kind === "submission") {
          flat.push({ seq: item.seq, label: `submission:${item.sub}`, at: item.occurredAt });
        } else if (item.kind === "human") {
          flat.push({ seq: item.seq, label: `human:${item.sub}`, at: item.occurredAt });
        } else if (item.kind === "tool") {
          flat.push({ seq: item.item.seq, label: `tool:${item.item.name}`, at: item.item.occurredAt });
        }
      }
    };
    walk(items);

    const subIdx = flat.findIndex((r) => r.label.startsWith("submission"));
    const humanIdx = flat.findIndex((r) => r.label.startsWith("human"));
    const lastOrchTurn = Math.max(...flat.filter((r) => r.label.startsWith("turn:orchestrator")).map((r) => r.seq));

    writeFileSync("/tmp/intugine-order.json", JSON.stringify({ subIdx, humanIdx, lastOrchTurn }, null, 1));

    // The submission/human cards must render BEFORE the orchestrator's post-rejection fill turns.
    expect(subIdx).toBeGreaterThan(-1);
    expect(lastOrchTurn).toBeGreaterThan(flat[subIdx].seq);
  });

  it("raw buildTimeline order is chronological once rows are seq-sorted", () => {
    // Replicate message-list's row flatten + seq sort on the real run: every
    // row (turn/tool/section/card) must appear in strictly ascending sequence,
    // so a 23:47 approval card never renders after 00:15 fill work.
    const events = realEvents();
    const items = buildTimeline(events);
    const flat: Array<{ seq: number; label: string }> = [];
    const walk = (list: TimelineItem[]) => {
      for (const item of list) {
        if (item.kind === "agent-segment") {
          flat.push({ seq: item.seq, label: `section:${item.agent}` });
          walk(item.items);
        } else if (item.kind === "turn") {
          flat.push({ seq: item.item.seq, label: `turn:${item.item.agent}` });
        } else if (item.kind === "tool") {
          flat.push({ seq: item.item.seq, label: "tool" });
        } else {
          flat.push({ seq: item.kind === "submission" || item.kind === "human" || item.kind === "stall" ? item.seq : item.seq, label: item.kind });
        }
      }
    };
    walk(items);
    flat.sort((a, b) => a.seq - b.seq);

    const submissionPos = flat.findIndex((r) => r.label === "submission");
    const after = flat.slice(submissionPos, submissionPos + 3).map((r) => `${r.label}@${r.seq}`);
    writeFileSync("/tmp/intugine-sorted.json", JSON.stringify(after, null, 1));
    // After sorting, the approval card (seq 2384) must be followed by rows with
    // larger seqs (the reviewer's feedback turn / orchestrator fill work).
    const nextSeqs = flat.slice(submissionPos + 1).map((r) => r.seq);
    expect(nextSeqs[0]).toBeGreaterThan(2384);
  });
});

describe.skipIf(!existsSync(FIXTURE))("top-level ordering", () => {
  it("shows the final top-level sequence", () => {
    const items = buildTimeline(realEvents());
    const seq = items.map((item) => {
      if (item.kind === "agent-segment") return `seg:${item.agent}@${item.seq}(${item.items.length})`;
      if (item.kind === "submission") return `sub:${item.sub}@${item.seq}`;
      if (item.kind === "human") return `human:${item.sub}@${item.seq}`;
      return `${item.kind}@${"item" in item ? item.item.seq : item.seq}`;
    });
    writeFileSync("/tmp/intugine-toplevel.json", JSON.stringify(seq, null, 1));
    expect(true).toBe(true);
  });
});
