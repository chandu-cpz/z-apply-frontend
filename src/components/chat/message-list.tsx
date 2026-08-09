import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { mergeLive, turnBoundaries, EMPTY_LIVELY } from "@/lib/live";
import { buildTimeline } from "@/lib/timeline/build";
import type { LiveAgent } from "@/lib/live";
import type { ActivityEvent, Run } from "@/types";
import { useLiveStore } from "@/live-store";
import { LiveAssistant, TurnMessage } from "./message-assistant";
import { ToolMessage } from "./message-tool";
import { ActivityGroup, HumanHandoffCard, ModelClusterRowCard, RecoveryRow, RunLabel, SectionDivider, SystemRow } from "./message-row";
import { flattenTimeline, groupRows, isQuiet, rowKey, type ChatRow } from "./rows";

const FOLLOW_THRESHOLD_PX = 80;

export function RowRenderer({ row }: { row: ChatRow }) {  switch (row.kind) {
    case "assistant-live":
      return <LiveAssistant agent={row.agent} />;
    case "turn":
      return <TurnMessage item={row.item} />;
    case "tool":
      return <ToolMessage item={row.item} />;
    case "section":
      return <SectionDivider agent={row.agent} status={row.status} occurredAt={row.occurredAt} parent={row.parent} />;
    case "run-label":
      return <RunLabel label={row.label} startedAt={row.startedAt} status={row.status} />;
    case "recovery":
      return <RecoveryRow attempt={row.item.attempt} errorType={row.item.errorType} detail={row.item.detail} stage={row.item.stage} occurredAt={row.item.occurredAt} />;
    case "model-cluster":
      return <ModelClusterRowCard item={row.item} />;
    case "row":
      if (row.item.kind === "human" && row.item.sub === "handoff") {
        return <HumanHandoffCard item={row.item} />;
      }
      return <SystemRow item={row.item} compact={isQuiet(row)} />;
    case "activity-group":
      return <ActivityGroup group={row} />;
  }
}

function EmptyState() {
  return (
    <div className="grid place-items-center px-6 py-24 text-center">
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        Live reasoning, tool calls and agent activity will stream here.
      </p>
    </div>
  );
}

export function MessageList({ runId, events, run }: { runId: string; events: ActivityEvent[]; run: Run }) {
  const boundaries = useMemo(() => turnBoundaries(events), [events]);
  const live = useLiveStore((state) => state.byRun[runId] ?? EMPTY_LIVELY);
  const liveAgents = useMemo<LiveAgent[]>(() => mergeLive(live, boundaries), [live, boundaries]);
  const rows = useMemo<ChatRow[]>(() => {
    const flat: ChatRow[] = [];
    // Completed timeline first (chronological), then the in-flight live
    // assistants appended at the bottom — the natural reading order for a
    // chat thread (Claude/ChatGPT append streaming content at the end).
    flattenTimeline(buildTimeline(events), flat);
    for (const agent of liveAgents) flat.push({ kind: "assistant-live", agent });
    return groupRows(flat);
  }, [liveAgents, events]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const followDown = useRef(true);
  const [jumpVisible, setJumpVisible] = useState(false);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - FOLLOW_THRESHOLD_PX;
    followDown.current = atBottom;
    setJumpVisible(!atBottom);
  };

  useEffect(() => {
    if (!followDown.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length, liveAgents.length, run.latest_run_sequence]);

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-background">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="log" aria-live="polite">
        <div className="mx-auto w-full max-w-[700px] px-5 py-7">
          {rows.length === 0 && <EmptyState />}
          {rows.map((row) => (
            <div key={rowKey(row)}>
              <RowRenderer row={row} />
            </div>
          ))}
        </div>
      </div>
      {jumpVisible && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-lg hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <ArrowDown size={14} />
          Jump to latest
        </button>
      )}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent")} />
    </section>
  );
}
