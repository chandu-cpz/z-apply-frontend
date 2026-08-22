import type { ActivityEvent } from "../types";

/**
 * Mechanical submission evidence, reduced from a run's event stream.
 *
 * Wire contract: the submit executor itself emits typed
 * `submission.completed` / `submission.failed` events, so success is an
 * executor acknowledgment — never orchestrator narration, never a screenshot.
 * The cockpit renders verdicts from this struct only.
 */

export interface SubmissionEvidence {
  /** Executor-acknowledged submit attempts (completed + failed events). */
  attempts: number;
  failures: number;
  lastError: string | null;
  completed: boolean;
  confirmationArtifactId: string | null;
  /** Stream sequence of the latest completion / failure, for ordering. */
  lastSuccessSeq: number | null;
  lastFailureSeq: number | null;
}

export const emptySubmissionEvidence: SubmissionEvidence = {
  attempts: 0,
  failures: 0,
  lastError: null,
  completed: false,
  confirmationArtifactId: null,
  lastSuccessSeq: null,
  lastFailureSeq: null,
};

/**
 * What the terminal banner may claim about the submission:
 * - verified:    outcome says submitted AND the executor confirmed it with no
 *                unresolved later failure.
 * - unconfirmed: outcome says submitted but executor evidence is missing or
 *                contradicted (the greenwash guard).
 * - errored:     submit failures exist and no verified claim stands.
 * - none:        nothing submission-related happened (or none of it yet).
 */
export type SubmissionVerdict = "verified" | "unconfirmed" | "errored" | "none";

export function reduceSubmissionEvidence(events: ActivityEvent[]): SubmissionEvidence {
  const evidence: SubmissionEvidence = { ...emptySubmissionEvidence };
  for (const event of events) {
    if (event.type === "submission.failed") {
      evidence.attempts += 1;
      evidence.failures += 1;
      evidence.lastFailureSeq = event.sequence;
      const error = typeof event.payload.error === "string" ? event.payload.error : null;
      if (error) evidence.lastError = error;
    } else if (event.type === "submission.completed") {
      evidence.attempts += 1;
      evidence.completed = true;
      evidence.lastSuccessSeq = event.sequence;
      const artifactId =
        firstString(event.payload.artifact_id, event.payload.confirmation_artifact_id);
      if (artifactId) evidence.confirmationArtifactId = artifactId;
    }
  }
  return evidence;
}

export function submissionVerdict(run: { status: string; outcome: string | null }, evidence: SubmissionEvidence): SubmissionVerdict {
  const claimed = run.outcome === "submitted_verified";
  if (claimed) {
    // A failure AFTER the latest acknowledged success means the claim is
    // stale: something errored beyond the point the executor last confirmed.
    const unresolved = evidence.lastFailureSeq !== null && (evidence.lastSuccessSeq === null || evidence.lastFailureSeq > evidence.lastSuccessSeq);
    if (!evidence.completed || unresolved) return "unconfirmed";
    return "verified";
  }
  return evidence.failures > 0 ? "errored" : "none";
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}
