import type { Run } from "../types";

/**
 * Single source of truth for run status presentation. Every chip, dot, rail
 * row, and banner pulls from here; feature files never hand-pick status
 * colors. Labels mirror backend truth: status/outcome strings come straight
 * off the run payload, nothing invented.
 *
 * Classes use semantic tokens only (bg-success, text-warning, ...) so theme
 * and contrast live in styles.css.
 */

export type RunState = "submitted" | "failed" | "waiting" | "running" | "finished";

export interface RunStatusMeta {
  state: RunState;
  label: string;
  /** Chip/pill treatment: surface + text. */
  cls: string;
  /** Status dot color (+ pulse while actively working or blocked on you). */
  dot: string;
  /** For Badge-style consumers that take a variant instead of classes. */
  variant: "success" | "destructive" | "warning" | "running" | "neutral";
}

export function getRunStatusMeta(run: Run): RunStatusMeta {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  const waiting = run.status === "waiting_human" || run.status === "human_control";
  const running = run.status === "running" || run.status === "starting";

  if (submitted) {
    return {
      state: "submitted",
      label: "submitted",
      cls: "bg-success/10 text-success",
      dot: "bg-success",
      variant: "success",
    };
  }
  if (failed) {
    return {
      state: "failed",
      label: run.outcome?.replaceAll("_", " ") || "failed",
      cls: "bg-destructive/10 text-destructive",
      dot: "bg-destructive",
      variant: "destructive",
    };
  }
  if (waiting) {
    return {
      state: "waiting",
      label: "needs you",
      cls: "bg-warning/15 text-warning",
      dot: "bg-warning animate-pulse",
      variant: "warning",
    };
  }
  if (running) {
    return {
      state: "running",
      label: run.status === "starting" ? "starting" : "running",
      cls: "bg-running/10 text-primary",
      dot: "bg-primary animate-pulse",
      variant: "running",
    };
  }
  return {
    state: "finished",
    label: run.outcome?.replaceAll("_", " ") || (run.status === "queued" ? "queued" : "finished"),
    cls: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    variant: "neutral",
  };
}
