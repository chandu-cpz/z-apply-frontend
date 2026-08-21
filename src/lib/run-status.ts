import type { Run } from "../types";

export type RunState = "submitted" | "failed" | "waiting" | "running" | "finished";

export function getRunStatusMeta(run: Run): { state: RunState; label: string; cls: string; dot: string } {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  const waiting = run.status === "waiting_human" || run.status === "human_control";
  const running = run.status === "running" || run.status === "starting";

  if (submitted) {
    return {
      state: "submitted",
      label: "submitted",
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  if (failed) {
    return {
      state: "failed",
      label: "failed",
      cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      dot: "bg-rose-500",
    };
  }
  if (waiting) {
    return {
      state: "waiting",
      label: "needs you",
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      dot: "bg-amber-500 animate-pulse",
    };
  }
  if (running) {
    return {
      state: "running",
      label: "running",
      cls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
      dot: "bg-violet-500 animate-pulse",
    };
  }
  return {
    state: "finished",
    label: run.outcome?.replaceAll("_", " ") || "finished",
    cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    dot: "bg-zinc-400",
  };
}
