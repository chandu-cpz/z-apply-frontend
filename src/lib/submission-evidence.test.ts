import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "../types";
import { emptySubmissionEvidence, reduceSubmissionEvidence, submissionVerdict } from "./submission-evidence";

let seq = 0;
function event(type: string, payload: Record<string, unknown> = {}): ActivityEvent {
  seq += 1;
  return {
    database_id: seq,
    run_id: "run-1",
    sequence: seq,
    occurred_at: "2026-08-22T03:00:00Z",
    type,
    source: { component: "graph" },
    level: "info",
    payload,
  };
}

describe("reduceSubmissionEvidence", () => {
  it("returns empty evidence for runs without submission events", () => {
    const evidence = reduceSubmissionEvidence([event("run.started"), event("tool.completed")]);
    expect(evidence).toEqual(emptySubmissionEvidence);
  });

  it("counts a completion as an executor acknowledgment", () => {
    const evidence = reduceSubmissionEvidence([
      event("submission.failed", { error: "no submit control" }),
      event("submission.completed", { artifact_id: "art-9" }),
    ]);
    expect(evidence.attempts).toBe(2);
    expect(evidence.failures).toBe(1);
    expect(evidence.completed).toBe(true);
    expect(evidence.confirmationArtifactId).toBe("art-9");
    expect(evidence.lastError).toBe("no submit control");
    expect(evidence.lastSuccessSeq!).toBeGreaterThan(evidence.lastFailureSeq!);
  });

  it("keeps the latest error when several failures occur", () => {
    const evidence = reduceSubmissionEvidence([
      event("submission.failed", { error: "first" }),
      event("submission.failed", { error: "second" }),
    ]);
    expect(evidence.failures).toBe(2);
    expect(evidence.lastError).toBe("second");
  });
});

describe("submissionVerdict", () => {
  it("is none for ordinary runs without submission activity", () => {
    const evidence = reduceSubmissionEvidence([]);
    expect(submissionVerdict({ status: "running", outcome: null }, evidence)).toBe("none");
  });

  it("verifies only when the outcome is backed by a completed event", () => {
    const verified = reduceSubmissionEvidence([event("submission.completed", {})]);
    expect(submissionVerdict({ status: "terminal", outcome: "submitted_verified" }, verified)).toBe("verified");
  });

  it("downgrades a claimed verification with no executor completion to unconfirmed", () => {
    // Narration and a screenshot, zero executor events: the greenwash shape.
    const evidence = reduceSubmissionEvidence([]);
    expect(submissionVerdict({ status: "terminal", outcome: "submitted_verified" }, evidence)).toBe("unconfirmed");
  });

  it("downgrades when a failure lands after the last acknowledged success", () => {
    const evidence = reduceSubmissionEvidence([
      event("submission.completed", {}),
      event("submission.failed", { error: "resubmit exploded" }),
    ]);
    expect(submissionVerdict({ status: "terminal", outcome: "submitted_verified" }, evidence)).toBe("unconfirmed");
  });

  it("reports errored while failures stand without any success claim", () => {
    const evidence = reduceSubmissionEvidence([event("submission.failed", { error: "boom" })]);
    expect(submissionVerdict({ status: "running", outcome: null }, evidence)).toBe("errored");
    expect(submissionVerdict({ status: "terminal", outcome: "failed" }, evidence)).toBe("errored");
  });
});
