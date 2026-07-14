import { Braces, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ActivityEvent } from "../../types";

/** Operational tool evidence. Core has already removed secrets and runtime objects. */
export function ToolActivity({ event, defaultExpanded = false }: { event: ActivityEvent; defaultExpanded?: boolean }) {
  const name = text(event.payload.tool_name) || "tool";
  const state = event.type.split(".").at(-1) ?? "activity";
  const [expanded, setExpanded] = useState(defaultExpanded || state === "failed" || state === "denied");
  const [payloadExpanded, setPayloadExpanded] = useState(defaultExpanded);
  if (!event.type.startsWith("tool.")) return null;
  const input = record(event.payload.input);
  const facts = toolFacts(name, input, event.payload);
  const callId = text(event.payload.tool_call_id);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-white font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-950">
      <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-zinc-900" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <Braces size={13} className="shrink-0 text-violet-500" />
        <span className="min-w-0 truncate font-semibold text-stone-800 dark:text-zinc-200">
          {name.replaceAll("_", " ")}
        </span>
        <span className={`ml-auto rounded px-1.5 py-0.5 uppercase ${stateTone(state)}`}>
          {state}
        </span>
        <ChevronRight size={12} className={`shrink-0 text-stone-400 transition-transform ${expanded ? "rotate-90" : ""}`}/>
      </button>

      {expanded && <>
      {callId && <div className="border-t border-stone-100 px-3 py-1.5 text-[9px] text-stone-400 dark:border-zinc-800 dark:text-zinc-600">call {callId}</div>}

      {facts.length > 0 && (
        <dl className="grid gap-2 border-t border-stone-100 px-3 py-3 text-stone-600 dark:border-zinc-800 dark:text-zinc-400">
          {facts.map((fact) => (
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2" key={`${fact.label}-${fact.value}`}>
              <dt className="uppercase tracking-[.08em] text-stone-400 dark:text-zinc-600">{fact.label}</dt>
              <dd className="max-h-36 min-w-0 overflow-auto whitespace-pre-wrap break-words text-stone-700 dark:text-zinc-300">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="border-t border-stone-100 dark:border-zinc-800">
        <button className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[9px] uppercase tracking-[.08em] text-stone-400 hover:text-violet-600 dark:text-zinc-600 dark:hover:text-violet-300" type="button" aria-expanded={payloadExpanded} onClick={() => setPayloadExpanded((value) => !value)}>
          <ChevronRight size={11} className={`transition-transform ${payloadExpanded ? "rotate-90" : ""}`} />
          Normalized payload
        </button>
        {payloadExpanded && <pre className="max-h-64 overflow-auto border-t border-stone-100 bg-stone-50 p-3 text-[9px] leading-relaxed whitespace-pre-wrap break-all text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {JSON.stringify(event.payload, null, 2)}
        </pre>}
      </div>
      </>}
    </div>
  );
}

interface Fact {
  label: string;
  value: string;
}

function toolFacts(name: string, input: Record<string, unknown>, payload: Record<string, unknown>): Fact[] {
  const facts: Fact[] = [];
  const description = text(input.description);
  if (name === "task" && description) {
    const sections = taskSections(description);
    push(facts, "specialist", text(input.subagent_type));
    push(facts, "operation", sections.operation || description);
    push(facts, "success", sections.success);
  } else {
    push(facts, "target", text(input.element) || text(input.target));
    push(facts, "url", text(input.url));
    push(facts, "text", text(input.text));
    const fields = array(input.fields)
      .map(record)
      .map((field) => {
        const label = text(field.name) || text(field.element) || text(field.target);
        const value = text(field.value);
        return label ? `${label}${value ? ` = ${value}` : ""}` : "";
      })
      .filter(Boolean);
    if (fields.length) push(facts, `fields (${fields.length})`, fields.join("\n"));
    const paths = array(input.paths).map(text).filter(Boolean).map(fileName);
    if (paths.length) push(facts, "files", paths.join(", "));
  }
  for (const [key, value] of Object.entries(input)) {
    if (["description", "subagent_type", "element", "target", "url", "text", "fields", "paths"].includes(key)) continue;
    push(facts, key.replaceAll("_", " "), display(value));
  }
  const output = record(payload.output);
  push(facts, "result", outputSummary(name, output.content ?? payload.output));
  push(facts, "error", text(payload.error));
  push(facts, "reason", text(payload.reason));
  return facts;
}

function outputSummary(name: string, value: unknown): string {
  const rendered = display(value);
  if (!rendered) return "";
  if (name.startsWith("browser_") && rendered.length > 320) {
    return `Browser evidence captured (${rendered.length.toLocaleString()} characters). Open Normalized payload for the complete snapshot.`;
  }
  if (rendered.length <= 600) return rendered;
  return `${rendered.slice(0, 520)}\n… ${rendered.length.toLocaleString()} characters total; open Normalized payload for all data.`;
}

function taskSections(value: string): { operation: string; success: string } {
  const operation = value.match(/OPERATION:\s*([\s\S]*?)(?=\nSUCCESS CONDITION:|$)/i)?.[1]?.trim() ?? "";
  const success = value.match(/SUCCESS CONDITION:\s*([\s\S]*?)(?=\n[A-Z][A-Z ]+:|$)/i)?.[1]?.trim() ?? "";
  return { operation, success };
}

function push(facts: Fact[], label: string, value: string): void {
  if (value) facts.push({ label, value });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function fileName(path: string): string {
  return path.split(/[\\/]/).at(-1) || "file";
}

function display(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return "";
}

function stateTone(state: string): string {
  if (state === "failed" || state === "denied") return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  if (state === "started" || state === "progress") return "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
}
