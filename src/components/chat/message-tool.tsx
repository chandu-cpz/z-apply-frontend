import { useState } from "react";
import { CheckCircle2, ChevronRight, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDur, humanModel, textOf } from "@/lib/format";
import type { ToolItem } from "@/lib/timeline/types";

/** Claude-style tool use: a single quiet row that expands into args/result.
 * No card chrome — the transcript stays text-first. */
export function ToolMessage({ item }: { item: ToolItem }) {
  const [open, setOpen] = useState(false);
  const failed = item.failed;
  const inFlight = item.inFlight;
  const hasDetails = Boolean(item.args || item.output || item.error);
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((value) => !value)}
        disabled={!hasDetails}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors",
          hasDetails ? "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50" : "cursor-default",
        )}
        aria-expanded={open}
      >
        {failed ? (
          <XCircle size={13} className="shrink-0 text-rose-400" />
        ) : inFlight ? (
          <LoaderCircle size={13} className="shrink-0 animate-spin text-violet-400" />
        ) : (
          <CheckCircle2 size={13} className="shrink-0 text-emerald-500/80" />
        )}
        <span className="truncate font-mono text-[12.5px] text-zinc-600 dark:text-zinc-300">
          {item.name.replaceAll("_", " ")}
        </span>
        {item.model && (
          <span className="hidden truncate text-[11px] text-zinc-400 sm:inline dark:text-zinc-500">
            {humanModel(item.model)}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
          {inFlight && <span className="text-violet-500 dark:text-violet-300">running…</span>}
          {failed && <span className="text-rose-500">failed</span>}
          {item.durationMs > 0 && <span>{fmtDur(item.durationMs)}</span>}
        </span>
        {hasDetails && (
          <ChevronRight
            size={12}
            className={cn(
              "shrink-0 text-zinc-300 transition-transform group-hover:text-zinc-400 dark:text-zinc-600",
              open && "rotate-90",
            )}
          />
        )}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 pl-5">
          {item.args && (
            <div className="min-w-0">
              <p className="mb-1 pl-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{textOf(item.args, 60) === item.args ? "" : "Args"}</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-50 px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                {item.args}
              </pre>
            </div>
          )}
          {(item.output || item.error) && (
            <pre
              className={cn(
                "max-h-72 overflow-auto rounded-lg px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap",
                failed
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
                  : "bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
              )}
            >
              {item.error || item.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
