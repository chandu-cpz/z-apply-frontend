import { Bot, ChevronRight, CircleAlert, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { ActivityEvent, Run } from "../types";
import { ToolActivity } from "./ai/tool-activity";
import { CodeBlock } from "./code-block";
import { useUiStore } from "../ui-store";

export function Activity({ run, events }: { run: Run; events: ActivityEvent[] }) {
  const expanded = useUiStore((state) => state.timelineExpanded); const toggle = useUiStore((state) => state.toggleTimeline); const viewport = useRef<HTMLDivElement>(null); const ordered = events.slice().reverse(); const virtual = useVirtualizer({ count: ordered.length, getScrollElement: () => viewport.current, estimateSize: () => 74, overscan: 8 });
  return <section className={`activity-panel panel ${expanded ? "timeline-expanded" : ""}`}><div className="section-heading"><div><span className="eyebrow">Operations timeline</span><h2>Autonomous activity</h2></div><button className="event-count" onClick={toggle}>{events.length} events</button></div>
    <div className="objective"><Bot size={17}/><div><b>{run.current_agent || "Orchestrator on standby"}</b><p>{run.task || "Applying the saved job-application playbook."}</p></div></div>
    <div className="timeline" ref={viewport}>{events.length === 0 ? <div className="empty-state"><Wrench size={22}/><p>Events will arrive here as soon as the run begins.</p></div> : <div style={{ height: virtual.getTotalSize(), position: "relative" }}>{virtual.getVirtualItems().map((item) => <div key={ordered[item.index].database_id} ref={virtual.measureElement} data-index={item.index} style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}><EventCard event={ordered[item.index]} /></div>)}</div>}</div>
  </section>;
}

function EventCard({ event }: { event: ActivityEvent }) {
  const Icon = event.level === "error" ? CircleAlert : event.type.includes("tool") ? Wrench : ChevronRight;
  return <motion.article initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`event-card ${event.level}`}><div className="event-icon"><Icon size={14}/></div><div><header><b>{event.type.replaceAll(".", " · ")}</b><time>{new Date(event.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></header><ToolActivity event={event}/>{Object.keys(event.payload).length > 0 && <CodeBlock value={event.payload}/>}</div></motion.article>;
}
