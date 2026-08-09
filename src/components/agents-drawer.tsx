import { Bot, Home, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, memo, useState } from "react";
import { useLiveStore } from "../live-store";
import type { ActivityEvent } from "../types";
import { AgentChatPanel } from "./agent-chat";
import { EMPTY_LIVELY, mergeLive, turnBoundaries, type LiveAgent } from "../lib/live";
import { buildTimeline } from "../lib/timeline/build";
import type { AgentSegmentItem } from "../lib/timeline/types";
import { humanAgent } from "../lib/format";
import { LiveAssistant } from "./chat/message-assistant";

type AgentRef = { kind: "live"; id: string } | { kind: "segment"; key: string; runIndex: number };

interface AgentRow {
  agent: AgentSegmentItem;
  runIndex: number;
  totalRuns: number;
}

function StatusDot({ status }: { status: "running" | "completed" | "failed" }) {
  return <span className={`mt-0.5 size-2 shrink-0 rounded-full ${status === "running" ? "bg-cyan-400 animate-pulse" : status === "failed" ? "bg-rose-400" : "bg-emerald-400"}`} />;
}

function runLabel(row: AgentRow): string {
  const name = humanAgent(row.agent.agent);
  if (row.totalRuns > 1) return `${name} · run ${row.runIndex + 1}`;
  return name;
}

function runSubtitle(row: AgentRow): string {
  const run = row.agent.runs[row.runIndex];
  const parts: string[] = [];
  if (run.spawned > 1) parts.push(`×${run.spawned} spawned`);
  if (run.parallel) parts.push("parallel");
  if (row.agent.parent) parts.push(`← ${humanAgent(row.agent.parent)}`);
  return parts.join(" · ");
}

function AgentRowButton({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${active ? "bg-cyan-50 ring-1 ring-cyan-200 dark:bg-cyan-950/40 dark:ring-cyan-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60"}`}
    >
      {children}
    </button>
  );
}

function sectionLabel(label: string): React.ReactNode {
  return <p className="px-2 pt-1 pb-1.5 font-mono text-[9px] tracking-[.14em] text-zinc-400 uppercase dark:text-zinc-600">{label}</p>;
}

const LiveAgentChat = memo(function LiveAgentChat({ agent }: { agent: LiveAgent }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300"><Bot size={15} /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{humanAgent(agent.agent)}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">live · streaming assistant</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <LoaderCircle size={11} className="animate-spin" /> streaming
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <LiveAssistant agent={agent} />
      </div>
    </div>
  );
});

export function AgentsDrawer({ runId, events, onClose }: { runId: string; events: ActivityEvent[]; onClose(): void }) {
  const [ref, setRef] = useState<AgentRef | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const live = useLiveStore((state) => state.byRun[runId] ?? EMPTY_LIVELY);
  const boundaries = useMemo(() => turnBoundaries(events), [events]);
  const liveAgents = useMemo(() => mergeLive(live, boundaries), [live, boundaries]);
  const segments = useMemo(() => {
    const collected: AgentSegmentItem[] = [];
    const walk = (items: ReturnType<typeof buildTimeline>) => {
      for (const item of items) {
        if (item.kind === "agent-segment") {
          collected.push(item);
          walk(item.items);
        }
      }
    };
    walk(buildTimeline(events));
    return collected;
  }, [events]);

  const runs = useMemo<AgentRow[]>(() => {
    const rows: AgentRow[] = [];
    for (const segment of segments) {
      for (let runIndex = 0; runIndex < segment.runs.length; runIndex += 1) {
        rows.push({ agent: segment, runIndex, totalRuns: segment.runs.length });
      }
    }
    return rows;
  }, [segments]);

  const segmentKeys = useMemo(() => new Set(segments.map((segment) => segment.key)), [segments]);
  const liveIds = useMemo(() => new Set(liveAgents.map((agent) => `${agent.agent}-${agent.firstSeq}`)), [liveAgents]);
  const valid = (candidate: AgentRef | null): candidate is AgentRef =>
    candidate !== null && ((candidate.kind === "live" && liveIds.has(candidate.id)) || (candidate.kind === "segment" && segmentKeys.has(candidate.key) && runIndexInRange(candidate, segments)));
  const current = valid(ref) ? ref : null;
  const effective: AgentRef | null = current
    ?? (liveAgents[0] ? { kind: "live", id: `${liveAgents[0].agent}-${liveAgents[0].firstSeq}` } : null)
    ?? (runs[0] ? { kind: "segment", key: runs[0].agent.key, runIndex: runs[0].runIndex } : null);

  const selectedSegment = effective?.kind === "segment" ? segments.find((segment) => segment.key === effective.key) : undefined;
  const selectedRunIndex = effective?.kind === "segment" && selectedSegment ? Math.min(effective.runIndex, selectedSegment.runs.length - 1) : undefined;
  const selectedLive = effective?.kind === "live" ? liveAgents.find((agent) => `${agent.agent}-${agent.firstSeq}` === effective.id) : undefined;
  const selectedRun = selectedSegment && selectedRunIndex !== undefined ? selectedSegment.runs[selectedRunIndex] : undefined;
  const selectedStatus: "running" | "completed" | "failed" = selectedRun?.status ?? selectedSegment?.status ?? "running";

  const mainRows = runs.filter((row) => row.agent.agent === "orchestrator");
  const subRows = runs.filter((row) => row.agent.agent !== "orchestrator");

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Agents">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[min(64rem,100vw)] flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <Bot size={15} className="text-violet-500" />
          <h2 className="font-mono text-[11px] font-semibold tracking-[.14em] text-zinc-700 uppercase dark:text-zinc-200">Agents</h2>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">{liveAgents.length} live · {runs.length} sessions</span>
          <button type="button" onClick={onClose} aria-label="Close agents" className="ml-auto grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
            <X size={15} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav className="w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-800 dark:bg-zinc-900/40">
            {liveAgents.length > 0 && sectionLabel("Streaming")}
            {liveAgents.map((agent) => {
              const id = `${agent.agent}-${agent.firstSeq}`;
              const active = effective?.kind === "live" && effective.id === id;
              return (
                <AgentRowButton key={id} active={active} onClick={() => setRef({ kind: "live", id })}>
                  <LoaderCircle size={12} className="shrink-0 animate-spin text-cyan-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{humanAgent(agent.agent)}</span>
                    <span className="block font-mono text-[9.5px] text-cyan-600 uppercase dark:text-cyan-300/80">live</span>
                  </span>
                </AgentRowButton>
              );
            })}
            {mainRows.length > 0 && sectionLabel("Main agent")}
            {mainRows.map((row) => {
              const status = row.agent.runs[row.runIndex].status;
              const active = effective?.kind === "segment" && effective.key === row.agent.key && effective.runIndex === row.runIndex;
              return (
                <AgentRowButton key={`${row.agent.key}-${row.runIndex}`} active={active} onClick={() => setRef({ kind: "segment", key: row.agent.key, runIndex: row.runIndex })} title={`${runSubtitle(row)} · ${status}`}>
                  <span className="grid size-5 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300"><Home size={11} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{runLabel(row)}</span>
                    <span className="block truncate font-mono text-[9.5px] text-zinc-400 dark:text-zinc-600">{runSubtitle(row)}</span>
                  </span>
                  <StatusDot status={status} />
                </AgentRowButton>
              );
            })}
            {subRows.length > 0 && sectionLabel("Subagents")}
            {subRows.map((row) => {
              const status = row.agent.runs[row.runIndex].status;
              const active = effective?.kind === "segment" && effective.key === row.agent.key && effective.runIndex === row.runIndex;
              return (
                <AgentRowButton key={`${row.agent.key}-${row.runIndex}`} active={active} onClick={() => setRef({ kind: "segment", key: row.agent.key, runIndex: row.runIndex })} title={`${runSubtitle(row)} · ${status}`}>
                  <StatusDot status={status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{runLabel(row)}</span>
                    <span className="block truncate font-mono text-[9.5px] text-zinc-400 dark:text-zinc-600">{runSubtitle(row)}</span>
                  </span>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{row.agent.runs[row.runIndex].items.length} items</span>
                </AgentRowButton>
              );
            })}
            {liveAgents.length === 0 && segments.length === 0 && (
              <p className="px-2 py-3 text-xs text-zinc-400 dark:text-zinc-600">No agents spawned yet.</p>
            )}
          </nav>
          <main className="min-w-0 flex-1 overflow-hidden bg-zinc-50/40 dark:bg-zinc-950/40">
            {selectedLive ? (
              <LiveAgentChat agent={selectedLive} />
            ) : selectedSegment ? (
              <AgentChatPanel segment={selectedSegment} runIndex={selectedRunIndex} />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center">
                <SelectHint status={selectedStatus} rows={runs} onPick={(key, runIndex) => setRef({ kind: "segment", key, runIndex })} />
              </div>
            )}
          </main>
        </div>
      </aside>
    </div>
  );
}

function SelectHint({ status, rows, onPick }: { status: string; rows: AgentRow[]; onPick(key: string, runIndex: number): void }) {
  return (
    <div className="w-full max-w-md px-6 text-center">
      <Bot size={24} className="mx-auto text-zinc-300 dark:text-zinc-700" />
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">Pick an agent to inspect its conversation.</p>
      {rows.length > 0 && (
        <button
          type="button"
          onClick={() => onPick(rows[0].agent.key, rows[0].runIndex)}
          className="mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
        >
          {status === "running" ? "Open current agent" : "Open first session"}
        </button>
      )}
    </div>
  );
}

function runIndexInRange(candidate: { kind: "segment"; key: string; runIndex: number }, segments: AgentSegmentItem[]): boolean {
  const segment = segments.find((item) => item.key === candidate.key);
  return Boolean(segment && candidate.runIndex >= 0 && candidate.runIndex < segment.runs.length);
}