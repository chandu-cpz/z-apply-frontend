import { useState } from "react";
import { CheckCircle2, ChevronRight, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDur, textOf } from "@/lib/format";
import type { ToolItem } from "@/lib/timeline/types";

export function ToolMessage({ item }: { item: ToolItem }) {
  const [openArgs, setOpenArgs] = useState(false);
  const [openResult, setOpenResult] = useState(false);
  const failed = item.failed;
  const inFlight = item.inFlight;
  const icon = failed ? (
    <XCircle size={15} className="shrink-0 text-rose-500" />
  ) : inFlight ? (
    <LoaderCircle size={15} className="shrink-0 animate-spin text-violet-500" />
  ) : (
    <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
  );
  return (
    <div className={cn("mb-3 rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900")}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        {icon}
        <span className="truncate font-mono text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{item.name.replaceAll("_", " ")}</span>
        {item.model && <span className="hidden truncate text-xs text-zinc-400 sm:inline dark:text-zinc-500">{item.model}</span>}
        <span className="ml-auto flex items-center gap-2.5">
          {failed && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">failed</span>}
          {inFlight && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/70 dark:text-violet-300">running</span>}
          {item.durationMs > 0 && <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">{fmtDur(item.durationMs)}</span>}
          <time className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500" title={`event #${item.seq}`}>
            {fmtTime(item.occurredAt)}
          </time>
        </span>
      </div>
      {item.args && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            onClick={() => setOpenArgs((value) => !value)}
            aria-expanded={openArgs}
          >
            <ChevronRight size={12} className={cn("shrink-0 text-zinc-400 transition-transform", openArgs && "rotate-90")} />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Args</span>
            <span className="ml-auto truncate pl-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">{textOf(item.args, 90)}</span>
          </button>
          {openArgs && (
            <pre className="mx-3.5 mb-2.5 max-h-72 overflow-auto rounded-lg bg-zinc-50 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
              {item.args}
            </pre>
          )}
        </div>
      )}
      {(item.output || item.error) && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            onClick={() => setOpenResult((value) => !value)}
            aria-expanded={openResult}
          >
            <ChevronRight size={12} className={cn("shrink-0 text-zinc-400 transition-transform", openResult && "rotate-90")} />
            <span className={cn("text-xs font-medium", failed ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400")}>{failed ? "Error" : "Result"}</span>
            <span className="ml-auto truncate pl-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">{textOf(item.error || item.output, 90)}</span>
          </button>
          {openResult && (
            <pre className={cn("mx-3.5 mb-2.5 max-h-96 overflow-auto rounded-lg p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap", failed ? "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300")}>
              {item.error || item.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function fmtTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
