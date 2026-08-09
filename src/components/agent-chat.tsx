import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Bot } from "lucide-react";
import { cn } from "../lib/utils";
import { humanAgent } from "../lib/format";
import type { AgentSegmentItem } from "../lib/timeline/types";
import { RowRenderer } from "./chat/message-list";
import { flattenTimeline, rowKey, type ChatRow } from "./chat/rows";

export function AgentChatPanel({ segment, runIndex }: { segment: AgentSegmentItem; runIndex?: number }) {
  const runs = runIndex === undefined ? segment.runs : [segment.runs[runIndex]].filter(Boolean);
  const shown = runs.reduce((sum, run) => sum + run.items.length, 0);
  const showRunHeader = shown !== segment.items.length || (runIndex === undefined && segment.runs.length > 1);
  const rows = useMemo<ChatRow[]>(() => {
    const flat: ChatRow[] = [];
    if (showRunHeader && runIndex === undefined) {
      segment.runs.forEach((run, index) => {
        flat.push({ kind: "run-label", label: `run ${index + 1}`, seq: run.seq, startedAt: run.startedAt, status: run.status });
        flattenTimeline(run.items, flat);
      });
    } else {
      for (const run of runs) flattenTimeline(run.items, flat);
    }
    return flat;
  }, [runs, segment.runs, showRunHeader, runIndex]);

  const statusTone = segment.status === "failed"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300"
    : segment.status === "completed"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
      : "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300";

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 110,
    overscan: 6,
  });

  const turnCount = shown === segment.items.length ? segment.items.filter((inner) => inner.kind === "turn").length : null;
  const toolCount = shown === segment.items.length ? segment.items.filter((inner) => inner.kind === "tool").length : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300"><Bot size={15} /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{humanAgent(segment.agent)}</p>
            <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
              {turnCount !== null ? `${turnCount} turns · ${toolCount} tools` : `${shown} items`}
              {segment.parent ? ` · from ${humanAgent(segment.parent)}` : ""}
            </p>
          </div>
          <span className={cn("ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", statusTone)}>{segment.status}</span>
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtual) => {
            const row = rows[virtual.index];
            return (
              <div
                key={rowKey(row)}
                data-index={virtual.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtual.start}px)` }}
              >
                <RowRenderer row={row} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
