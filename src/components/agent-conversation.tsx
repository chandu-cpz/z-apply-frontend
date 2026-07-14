import { AnimatePresence, motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Bot, CircleAlert, LoaderCircle, ShieldAlert, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { ActivityEvent, HumanRequest, Run } from "../types";
import { ToolActivity } from "./ai/tool-activity";

interface Props { run: Run; events: ActivityEvent[]; pendingRequest?: HumanRequest; }

export function AgentConversation({ run, events, pendingRequest }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const activity = useMemo(() => curateEvents(events), [events]);
  // TanStack Virtual intentionally returns imperative functions; this component is not compiler-memoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({ count: activity.length, getScrollElement: () => viewport.current, estimateSize: () => 132, overscan: 6 });
  useEffect(() => { if (activity.length) virtualizer.scrollToIndex(activity.length - 1, { align: "end" }); }, [activity.length, virtualizer]);
  return <section className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden bg-white dark:bg-zinc-950">
    <header className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-zinc-800"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-violet-50 shadow-lg shadow-violet-200 dark:shadow-violet-950"><Bot size={18}/></span><div><span className="font-mono text-[10px] tracking-[.14em] text-stone-500 dark:text-zinc-500">LIVE RUN NARRATIVE</span><h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-950 dark:text-zinc-100">What the agent is doing</h2></div></div><div className="hidden font-mono text-[10px] text-stone-500 dark:text-zinc-500 sm:block"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-cyan-500 shadow-sm shadow-cyan-300"/>Streaming activity</div></header>
    <div className="flex items-start gap-3 border-b border-stone-200 bg-stone-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50"><span className={`mt-3 size-2 shrink-0 rounded-full ${nowTone(run.status)}`}/><div><span className="font-mono text-[10px] tracking-[.14em] text-stone-500 dark:text-zinc-500">HAPPENING NOW</span><p className="mt-1.5 text-[15px] leading-relaxed text-stone-800 dark:text-zinc-200">{nowDescription(run)}</p></div><span className="ml-auto mt-1 hidden shrink-0 rounded-full border border-stone-300 px-2 py-1 font-mono text-[9px] text-stone-500 dark:border-zinc-700 dark:text-zinc-500 sm:inline">{run.status === "human_control" ? "You control" : "Agent controls"}</span></div>
    <div className="min-h-0 overflow-y-auto scroll-smooth" ref={viewport} aria-live="polite"><div className="mx-auto w-full max-w-5xl px-5 py-5"><div className="mb-4 ml-11 font-mono text-[10px] tracking-[.1em] text-stone-400 uppercase dark:text-zinc-600">Verified activity · {activity.length} events</div><div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>{virtualizer.getVirtualItems().map((row) => { const event = activity[row.index]; return event ? <div className="absolute top-0 left-0 w-full pb-4" data-index={row.index} key={event.database_id} ref={virtualizer.measureElement} style={{ transform: `translateY(${row.start}px)` }}><AnimatePresence initial={false}><ConversationMessage event={event}/></AnimatePresence></div> : null; })}</div><div className="mt-2">{pendingRequest ? <HumanNeeded request={pendingRequest}/> : <ListeningState run={run}/>}</div></div></div>
  </section>;
}

function ConversationMessage({ event }: { event: ActivityEvent }) {
  const tool = event.type.includes("tool"); const Icon = event.level === "error" ? CircleAlert : tool ? Wrench : Bot;
  return <motion.article className="grid grid-cols-[32px_minmax(0,1fr)] gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}><span className={`grid size-8 place-items-center rounded-lg ${event.level === "error" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200" : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"}`}><Icon size={16}/></span><div className={`min-w-0 rounded-r-xl rounded-bl-xl border p-4 ${event.level === "error" ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50" : "border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900"}`}><div className="flex items-baseline gap-2"><b className="text-sm font-semibold text-stone-950 capitalize dark:text-zinc-100">{speaker(event)}</b><time className="font-mono text-[10px] text-stone-400 dark:text-zinc-600">{formatTime(event.occurred_at)}</time></div><p className="mt-2 text-[15px] leading-6 text-stone-700 dark:text-zinc-300">{describe(event)}</p>{tool && <ToolActivity event={event}/>}</div></motion.article>;
}

function HumanNeeded({ request }: { request: HumanRequest }) { return <article className="grid grid-cols-[30px_minmax(0,1fr)] gap-2.5"><span className="grid size-[29px] place-items-center rounded-lg bg-amber-200 text-amber-950"><ShieldAlert size={15}/></span><div className="min-w-0 rounded-r-xl rounded-bl-xl border border-amber-300/50 bg-amber-950/40 p-3"><div className="flex items-baseline gap-2"><b className="text-xs text-amber-100">Your input is needed</b><span className="font-mono text-[10px] text-amber-200/70">agent paused safely</span></div><p className="mt-2 text-sm leading-relaxed text-amber-50">{request.question}</p><small className="mt-2 block text-xs text-amber-200">Use the human checkpoint beside the browser.</small></div></article>; }
function ListeningState({ run }: { run: Run }) { if (run.status === "terminal") return <div className="ml-10 border-l-2 border-zinc-700 pl-3 text-xs text-zinc-500">This run has finished. Its recorded outcome is in the context pane.</div>; return <div className="ml-10 flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle className="animate-spin text-cyan-300" size={14}/>{run.status === "waiting_human" ? "Waiting for your decision" : "Listening for the next verified update"}</div>; }

function nowDescription(run: Run): string { if (run.status === "waiting_human") return "The agent has paused safely and needs your response before continuing."; if (run.status === "human_control") return "You have browser control. The agent is paused until you return it."; if (run.status === "terminal") return run.summary || "This run has reached its recorded outcome."; return `${agentStartedDescription(canonicalAgent(run.current_agent))} Phase: ${run.phase.replaceAll("_", " ")}.`; }
function nowTone(status: Run["status"]): string { if (status === "waiting_human") return "bg-amber-300 shadow-sm shadow-amber-300"; if (status === "human_control") return "bg-violet-300 shadow-sm shadow-violet-300"; if (status === "terminal") return "bg-zinc-600"; return "bg-cyan-300 shadow-sm shadow-cyan-300"; }
function speaker(event: ActivityEvent): string { const candidate = event.source.agent || event.source.name || event.source.component; if (candidate) return candidate.replaceAll("_", " "); if (event.type.startsWith("browser.")) return "Browser workspace"; return "Application agent"; }
function describe(event: ActivityEvent): string { const payload = event.payload; for (const key of ["message", "summary", "detail", "description", "action", "reason"]) { const value = payload[key]; if (typeof value === "string" && value.trim()) return value; } const toolName = typeof payload.tool_name === "string" ? payload.tool_name : ""; if (toolName === "task") return event.type === "tool.started" ? "Delegating a focused step to a specialist." : "The delegated specialist returned structured evidence."; if (toolName) return `${event.type === "tool.started" ? "Running" : "Completed"} ${toolName.replaceAll("_", " ")}.`; const descriptions: Record<string, string> = { "run.queued": "The application has been placed in the execution queue.", "run.started": "The run has started and the persistent workspace is being prepared.", "run.terminal": "The run reached a terminal state. Review the outcome in the context pane.", "agent.started": agentStartedDescription(event.source.agent), "agent.completed": "A specialist completed its assigned step and returned evidence to the orchestrator.", "tool.started": "Inspecting the current browser evidence before taking the next action.", "tool.completed": "The browser action completed and its evidence was recorded.", "human.requested": "The agent needs an explicit human decision before it can continue.", "human.resolved": "Your response was recorded and the agent can continue safely.", "browser.control_taken": "Browser control is now with you; agent mutations are paused.", "browser.control_returned": "Browser control was returned to the agent.", "submission.review_ready": "Independent review found the application complete and ready for your approval.", "submission.review_not_ready": "Independent review found remaining work before submission can be requested.", "browser.page_lost": "The run-owned browser page is no longer available." }; return descriptions[event.type] || `Recorded ${event.type.replaceAll(".", " ").replaceAll("_", " ")}.`; }
function curateEvents(events: ActivityEvent[]): ActivityEvent[] {
  const retained: ActivityEvent[] = [];
  const toolPositions = new Map<string, number>();
  let lastAgent: string | undefined;
  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    if (event.type.startsWith("tool.") && hasVisibleToolDetail(event)) {
      const callId = typeof event.payload.tool_call_id === "string" ? event.payload.tool_call_id : "";
      const priorPosition = callId ? toolPositions.get(callId) : undefined;
      if (priorPosition !== undefined && event.type !== "tool.started") {
        const started = retained[priorPosition];
        retained[priorPosition] = { ...event, payload: { ...started.payload, ...event.payload } };
      } else {
        if (callId && event.type === "tool.started") toolPositions.set(callId, retained.length);
        retained.push(event);
      }
      continue;
    }
    if (event.level === "error" || event.level === "warning" || event.type.startsWith("run.") || event.type.startsWith("human.") || event.type.startsWith("browser.") || event.type.startsWith("submission.") || event.type.startsWith("recovery.") || event.type === "model.selected") {
      retained.push(event);
      continue;
    }
    if (event.type === "agent.started") {
      const agent = canonicalAgent(event.source.agent);
      if (agent && agent !== lastAgent) retained.push(event);
      lastAgent = agent;
      continue;
    }
    if (event.type === "agent.completed" || event.type === "agent.failed") {
      retained.push(event);
      continue;
    }
  }
  return retained;
}
function canonicalAgent(value?: string | null): string | undefined { return value?.split(":", 1)[0]; }
function hasVisibleToolDetail(event: ActivityEvent): boolean { return ["message", "summary", "detail", "description", "action", "name", "tool_name", "error"].some((key) => { const value = event.payload[key]; return typeof value === "string" && value.trim().length > 0; }); }
function agentStartedDescription(agent?: string): string { const descriptions: Record<string, string> = { authenticate_default_account: "Checking the saved authenticated browser session.", lifecycle: "Preparing the persistent browser workspace.", orchestrator: "Coordinating the next verified application step.", values: "Loading the application profile values." }; const canonical = canonicalAgent(agent); return canonical ? descriptions[canonical] || `The ${canonical.replaceAll("_", " ")} specialist started its step.` : "A specialist has started its assigned application step."; }
function formatTime(value: string): string { return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
