import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDur, fmtNum, humanModel } from "@/lib/format";
import { useModelPerformance } from "@/lib/perf";

export function MetricsStrip({ runId, liveCount }: { runId: string; liveCount: number }) {
  const perf = useModelPerformance(runId);
  const calls = perf.reduce((sum, item) => sum + item.calls, 0);
  const inTokens = perf.reduce((sum, item) => sum + item.totalInputTokens, 0);
  const outTokens = perf.reduce((sum, item) => sum + item.totalOutputTokens, 0);
  const ttftMs = perf.length ? perf.reduce((sum, item) => sum + item.avgTtftMs, 0) / perf.length : 0;
  const tps = perf.length ? perf.reduce((sum, item) => sum + item.avgTokPerSecond, 0) / perf.length : 0;
  const costUsd = perf.reduce((sum, item) => sum + item.costUsd, 0);
  const avgIn = calls > 0 ? inTokens / calls : 0;
  const model = perf.length ? perf[0].model : "selecting…";

  const chip = "flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-b border-zinc-200/80 bg-background/95 px-5 py-2 backdrop-blur dark:border-zinc-800">
      <span className={cn(chip, "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300")}>
        {liveCount > 0 ? <LoaderCircle size={11} className="animate-spin" /> : <span className="size-1.5 rounded-full bg-emerald-400" />}
        {humanModel(model)}
      </span>
      <span className={chip} title="model calls">
        {calls} calls
      </span>
      <span className={cn(chip, "tabular-nums")} title={`cumulative input tokens across ${calls} calls (~${fmtNum(avgIn)}/call; every call re-sends the growing context)`}>
        in {fmtNum(inTokens)}<span className="text-zinc-400 dark:text-zinc-600">/total</span>
      </span>
      <span className={cn(chip, "tabular-nums")} title="output tokens">
        out {fmtNum(outTokens)}
      </span>
      <span className={cn(chip, "tabular-nums")} title="time to first token (avg)">
        TTFT {ttftMs > 0 ? fmtDur(ttftMs) : "—"}
      </span>
      <span className={cn(chip, "tabular-nums")} title="tokens per second (avg)">
        {tps > 0 ? `${tps.toFixed(0)} tok/s` : "—"}
      </span>
      {costUsd > 0 && (
        <span className={cn(chip, "tabular-nums")} title={`estimated cost at ${perf[0]?.provider ?? "opencodego"} list rates`}>
          ~${costUsd.toFixed(3)}
        </span>
      )}
    </div>
  );
}
