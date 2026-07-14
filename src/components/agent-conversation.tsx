import { AnimatePresence, motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Bot, ChevronRight, CircleAlert, LoaderCircle, Send, ShieldAlert, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityEvent, HumanRequest, Run } from "../types";
import { ToolActivity } from "./ai/tool-activity";

interface Props { run: Run; events: ActivityEvent[]; pendingRequest?: HumanRequest; busy?: boolean; onSendContext(content: string): void; }

export function AgentConversation({ run, events, pendingRequest, busy = false, onSendContext }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const activity = useMemo(() => curateEvents(events), [events]);
  const groups = useMemo(() => groupEvents(activity), [activity]);
  // TanStack Virtual intentionally returns imperative functions; this component is not compiler-memoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({ count: groups.length, getScrollElement: () => viewport.current, estimateSize: () => 112, overscan: 6 });
  useEffect(() => { if (groups.length) virtualizer.scrollToIndex(groups.length - 1, { align: "end" }); }, [groups.length, virtualizer]);
  return <section className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-white dark:bg-zinc-950">
    <div className="min-h-0 overflow-y-auto scroll-smooth" ref={viewport} aria-live="polite"><div className="mx-auto w-full max-w-5xl px-5 py-5"><div className="mb-4 ml-11 font-mono text-[10px] tracking-[.1em] text-stone-400 uppercase dark:text-zinc-600">Verified activity · {groups.length} turns · {activity.length} events</div><div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>{virtualizer.getVirtualItems().map((row) => { const group = groups[row.index]; return group ? <div className="absolute top-0 left-0 w-full pb-4" data-index={row.index} key={group.id} ref={virtualizer.measureElement} style={{ transform: `translateY(${row.start}px)` }}><AnimatePresence initial={false}><ConversationGroup group={group} latest={row.index === groups.length - 1}/></AnimatePresence></div> : null; })}</div><div className="mt-2">{pendingRequest ? <HumanNeeded request={pendingRequest}/> : <ListeningState run={run}/>}</div></div></div>
    <SteeringComposer run={run} busy={busy} onSend={onSendContext}/>
  </section>;
}

function SteeringComposer({ run, busy, onSend }: { run: Run; busy: boolean; onSend(content: string): void }) {
  const [content, setContent] = useState("");
  const disabled = run.status === "terminal" || busy;
  const submit = () => {
    const value = content.trim();
    if (!value || disabled) return;
    onSend(value);
    setContent("");
  };
  return <form className="border-t border-stone-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <div className="rounded-xl border border-stone-300 bg-stone-50 p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-violet-500 dark:focus-within:ring-violet-950">
      <textarea className="max-h-36 min-h-12 w-full resize-none bg-transparent px-1.5 py-1 text-sm leading-relaxed text-stone-900 outline-none placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-600" value={content} maxLength={8000} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder={run.status === "terminal" ? "This run has ended" : "Steer the agent, correct a fact, or add context…"} disabled={disabled}/>
      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <span className="font-mono text-[9px] uppercase tracking-[.08em] text-stone-400 dark:text-zinc-600">Delivered to this active run · Shift+Enter for newline</span>
        <button className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40" type="submit" disabled={disabled || !content.trim()}><Send size={13}/>{busy ? "Delivering" : "Send"}</button>
      </div>
    </div>
  </form>;
}

interface ActivityGroup { id: string; label: string; events: ActivityEvent[]; }

function ConversationGroup({ group, latest }: { group: ActivityGroup; latest: boolean }) {
  const [expanded, setExpanded] = useState(latest || group.events.some(isImportant));
  const failed = group.events.some((event) => event.level === "error");
  const hasTool = group.events.some((event) => event.type.startsWith("tool."));
  const last = group.events.at(-1)!;
  const Icon = failed ? CircleAlert : hasTool ? Wrench : Bot;
  const firstTime = formatTime(group.events[0].occurred_at);
  const lastTime = formatTime(last.occurred_at);
  return <motion.article className="grid grid-cols-[32px_minmax(0,1fr)] gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}><span className={`grid size-8 place-items-center rounded-lg ${failed ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200" : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"}`}><Icon size={16}/></span><div className={`min-w-0 overflow-hidden rounded-r-xl rounded-bl-xl border ${failed ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50" : "border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900"}`}><button className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-white/70 dark:hover:bg-zinc-800/60" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><span className="min-w-0"><span className="flex items-baseline gap-2"><b className="truncate text-sm font-semibold text-stone-950 capitalize dark:text-zinc-100">{group.label}</b><time className="shrink-0 font-mono text-[10px] text-stone-400 dark:text-zinc-600">{firstTime === lastTime ? firstTime : `${firstTime}–${lastTime}`}</time><span className="rounded bg-stone-200/70 px-1.5 py-0.5 font-mono text-[9px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-500">{group.events.length} {group.events.length === 1 ? "update" : "updates"}</span></span><span className="mt-1 block truncate text-sm text-stone-600 dark:text-zinc-400">{describe(last)}</span></span><ChevronRight className={`shrink-0 text-stone-400 transition-transform ${expanded ? "rotate-90" : ""}`} size={15}/></button>{expanded && <div className="divide-y divide-stone-200 border-t border-stone-200 dark:divide-zinc-800 dark:border-zinc-800">{group.events.map((event, index) => { const newest = latest && index === group.events.length - 1; const model = actionModel(event); return <div className="px-4 py-3" key={event.database_id}><div className="flex items-start gap-2"><time className="mt-0.5 shrink-0 font-mono text-[9px] text-stone-400 dark:text-zinc-600">{formatTime(event.occurred_at)}</time><p className="min-w-0 flex-1 text-sm leading-5 whitespace-pre-wrap break-words text-stone-700 dark:text-zinc-300">{describe(event)}</p>{model && <span className="max-w-48 shrink-0 truncate rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[9px] text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300" title={model}>{shortModel(model)}</span>}</div>{event.type.startsWith("tool.") ? <ToolActivity event={event} defaultExpanded={newest}/> : <EventPayload event={event} defaultExpanded={newest}/>}</div>; })}</div>}</div></motion.article>;
}

function EventPayload({ event, defaultExpanded = false }: { event: ActivityEvent; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (Object.keys(event.payload).length === 0) return null;
  return <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-white font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-950"><button className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[9px] uppercase tracking-[.08em] text-stone-400 hover:text-violet-600 dark:text-zinc-600 dark:hover:text-violet-300" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><ChevronRight size={11} className={`transition-transform ${expanded ? "rotate-90" : ""}`}/>Event data</button>{expanded && <pre className="max-h-72 overflow-auto border-t border-stone-100 bg-stone-50 p-3 text-[9px] leading-relaxed whitespace-pre-wrap break-all text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">{JSON.stringify(event.payload, null, 2)}</pre>}</div>;
}

function isImportant(event: ActivityEvent): boolean { return event.level === "error" || event.level === "warning" || event.type.startsWith("human.") || event.type.startsWith("submission.") || event.type.startsWith("recovery.") || event.type === "run.terminal"; }

function HumanNeeded({ request }: { request: HumanRequest }) { return <article className="grid grid-cols-[30px_minmax(0,1fr)] gap-2.5"><span className="grid size-[29px] place-items-center rounded-lg bg-amber-200 text-amber-950"><ShieldAlert size={15}/></span><div className="min-w-0 rounded-r-xl rounded-bl-xl border border-amber-300/50 bg-amber-950/40 p-3"><div className="flex items-baseline gap-2"><b className="text-xs text-amber-100">Your input is needed</b><span className="font-mono text-[10px] text-amber-200/70">agent paused safely</span></div><p className="mt-2 text-sm leading-relaxed text-amber-50">{request.question}</p><small className="mt-2 block text-xs text-amber-200">Use the human checkpoint beside the browser.</small></div></article>; }
function ListeningState({ run }: { run: Run }) { if (run.status === "terminal") return <div className="ml-10 border-l-2 border-zinc-700 pl-3 text-xs text-zinc-500">This run has finished. Its recorded outcome is in the context pane.</div>; return <div className="ml-10 flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle className="animate-spin text-cyan-300" size={14}/>{run.status === "waiting_human" ? "Waiting for your decision" : "Listening for the next verified update"}</div>; }

function speaker(event: ActivityEvent): string {
  if (event.type === "context.received") return "You";
  if (event.type.startsWith("run.")) return "Run status";
  if (event.type.startsWith("browser.")) return "Browser workspace";
  if (event.type.startsWith("human.")) return "Human checkpoint";
  if (event.type.startsWith("submission.")) return "Submission safety";
  if (event.type.startsWith("recovery.")) return "Recovery controller";
  const candidate = event.source.agent || event.source.name;
  return candidate ? candidate.replaceAll("_", " ") : "Application agent";
}
function describe(event: ActivityEvent): string { const payload = event.payload; if (event.type === "context.received" && typeof payload.content === "string") return payload.content; if (event.type.startsWith("model.")) return describeModel(event); if (event.type === "run.phase_changed") return `The browser workspace is ready. ${String(payload.phase || "Application").replaceAll("_", " ")} work has started.`; for (const key of ["message", "summary", "detail", "description", "action", "reason"]) { const value = payload[key]; if (typeof value === "string" && value.trim()) return value; } const toolName = typeof payload.tool_name === "string" ? payload.tool_name : ""; if (toolName === "task") { const input = payload.input && typeof payload.input === "object" && !Array.isArray(payload.input) ? payload.input as Record<string, unknown> : {}; const specialist = typeof input.subagent_type === "string" ? input.subagent_type : "specialist"; return event.type === "tool.started" ? `Delegating a focused step to ${specialist}.` : `${specialist} returned authoritative tool output.`; } if (toolName) return `${event.type === "tool.started" ? "Running" : event.type === "tool.failed" ? "Failed" : "Completed"} ${toolName.replaceAll("_", " ")}.`; const descriptions: Record<string, string> = { "run.terminal": "The run reached a terminal state. Review the outcome in the context pane.", "agent.started": agentStartedDescription(event.source.agent), "agent.completed": "A specialist completed its assigned step and returned evidence to the orchestrator.", "tool.started": "Inspecting the current browser evidence before taking the next action.", "tool.completed": "The browser action completed and its evidence was recorded.", "human.requested": "The agent needs an explicit human decision before it can continue.", "human.resolved": "Your response was recorded and the agent can continue safely.", "browser.control_taken": "Browser control is now with you; agent mutations are paused.", "browser.control_returned": "Browser control was returned to the agent.", "submission.review_ready": "Independent review found the application complete and ready for your approval.", "submission.review_not_ready": "Independent review found remaining work before submission can be requested.", "browser.page_lost": "The run-owned browser page is no longer available." }; return descriptions[event.type] || `Recorded ${event.type.replaceAll(".", " ").replaceAll("_", " ")}.`; }
function describeModel(event: ActivityEvent): string { const model = typeof event.payload.model_id === "string" ? event.payload.model_id : "model"; const role = typeof event.payload.role === "string" ? event.payload.role.replaceAll("_", " ") : "agent"; if (event.type === "model.selected") return `${role} selected ${model}.`; if (event.type === "model.failed") return `${model} failed for ${role}: ${String(event.payload.error || event.payload.error_type || "provider failure")}`; if (event.type === "model.rotated") return `Rotating away from ${model}: ${String(event.payload.reason || "recovery")}.`; if (event.type === "model.rate_limited") return `${model} was rate limited; the router will select another eligible model.`; return `${event.type.replaceAll(".", " ")}: ${model}.`; }
function curateEvents(events: ActivityEvent[]): ActivityEvent[] {
  const retained: ActivityEvent[] = [];
  const toolPositions = new Map<string, number>();
  let lastAgent: string | undefined;
  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    if (["run.queued", "run.started", "browser.page_opened"].includes(event.type)) continue;
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
    if (event.level === "error" || event.level === "warning" || event.type.startsWith("run.") || event.type.startsWith("human.") || event.type.startsWith("browser.") || event.type.startsWith("submission.") || event.type.startsWith("recovery.") || event.type.startsWith("model.") || event.type === "context.received") {
      retained.push(event);
      continue;
    }
    if (event.type === "agent.started") {
      const agent = canonicalAgent(event.source.agent);
      if (agent && agent !== lastAgent) retained.push(event);
      lastAgent = agent;
      continue;
    }
    if (event.type === "agent.failed") {
      retained.push(event);
      continue;
    }
  }
  return retained;
}
function groupEvents(events: ActivityEvent[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const event of events) {
    const label = speaker(event);
    const current = groups.at(-1);
    if (current?.label === label) {
      current.events.push(event);
      current.id = `${current.events[0].database_id}-${event.database_id}`;
    } else {
      groups.push({ id: String(event.database_id), label, events: [event] });
    }
  }
  return groups;
}
function canonicalAgent(value?: string | null): string | undefined { return value?.split(":", 1)[0]; }
function hasVisibleToolDetail(event: ActivityEvent): boolean { return ["message", "summary", "detail", "description", "action", "name", "tool_name", "error"].some((key) => { const value = event.payload[key]; return typeof value === "string" && value.trim().length > 0; }); }
function agentStartedDescription(agent?: string): string { const descriptions: Record<string, string> = { authenticate_default_account: "Checking the saved authenticated browser session.", lifecycle: "Preparing the persistent browser workspace.", orchestrator: "Coordinating the next verified application step.", values: "Loading the application profile values." }; const canonical = canonicalAgent(agent); return canonical ? descriptions[canonical] || `The ${canonical.replaceAll("_", " ")} specialist started its step.` : "A specialist has started its assigned application step."; }
function formatTime(value: string): string { return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function actionModel(event: ActivityEvent): string | undefined { const value = event.payload.model_id; return !event.type.startsWith("model.") && typeof value === "string" && value ? value : undefined; }
function shortModel(model: string): string { return model.includes("/") ? model.slice(model.indexOf("/") + 1) : model; }
