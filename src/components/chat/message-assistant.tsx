import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtTime, humanAgent } from "@/lib/format";
import type { LiveAgent } from "@/lib/live";
import type { TurnItem } from "@/lib/timeline/types";

export function AgentAvatar({ streaming = false }: { streaming?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full shadow-sm",
        streaming
          ? "bg-violet-100 text-violet-600 ring-1 ring-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:ring-violet-900"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400",
      )}
    >
      <Sparkles size={16} />
    </span>
  );
}

function ThinkingStrip({ reasoning, streaming = false }: { reasoning: string; streaming?: boolean }) {
  const [open, setOpen] = useState(true);
  if (!reasoning && !streaming) return null;
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-violet-200/70 bg-violet-50/50 dark:border-violet-900/40 dark:bg-violet-950/15">
      <button
        type="button"
        className={cn("flex w-full items-center gap-2 px-3 py-2 text-left", open ? "" : "hover:bg-violet-100/40 dark:hover:bg-violet-900/20")}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {streaming ? (
          <span className="size-3 shrink-0 animate-pulse rounded-full border-2 border-violet-400 border-t-transparent" />
        ) : (
          <ChevronRight size={13} className={cn("shrink-0 text-violet-400 transition-transform", open && "rotate-90")} />
        )}
        <span className="text-xs font-medium text-violet-600 dark:text-violet-300">{streaming ? "Thinking…" : "Thought"}</span>
        {!streaming && reasoning && (
          <span className="ml-auto hidden truncate text-xs text-violet-400/80 sm:inline dark:text-violet-300/60">{reasoning.slice(0, 72)}</span>
        )}
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-violet-200/60 px-3 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-600 dark:border-violet-900/40 dark:text-zinc-300">
          {reasoning}
          {streaming && <span className="animate-pulse text-violet-500">▍</span>}
        </pre>
      )}
    </div>
  );
}

function AssistantText({ text, streaming }: { text: string; streaming: boolean }) {
  if (streaming) {
    return (
      <p className="text-pretty whitespace-pre-wrap text-[15px] leading-relaxed">
        {text}
        <span className="animate-z-blink ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[2px] rounded-[1px] bg-zinc-600 dark:bg-zinc-300" aria-hidden />
      </p>
    );
  }
  return (
    <div className="text-[15px] leading-relaxed text-zinc-800 [&_p]:my-2.5 [&_li]:my-1 [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_a]:text-violet-600 [&_a]:underline dark:text-zinc-200 dark:[&_a]:text-violet-300 [&_pre]:my-2.5 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-zinc-950 [&_pre]:p-3.5 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:text-zinc-100 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-zinc-800 dark:[&_pre]:bg-zinc-950 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-100">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

export function TurnMessage({ item }: { item: TurnItem }) {
  const hasProse = Boolean(item.text.trim());
  const hasReasoning = Boolean(item.reasoning.trim());
  if (!hasProse && !hasReasoning) return null;
  return (
    <div className="mb-7 flex items-start gap-3.5">
      <AgentAvatar />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline gap-2.5 px-0.5">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{humanAgent(item.agent)}</span>
          {item.model && <span className="truncate text-xs text-zinc-400 dark:text-zinc-500">{item.model}</span>}
          <time className="ml-auto shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500" title={`event #${item.seq}`}>
            {fmtTime(item.occurredAt)}
          </time>
        </div>
        {hasReasoning && <ThinkingStrip reasoning={item.reasoning} />}
        {hasProse && <AssistantText text={item.text} streaming={false} />}
        {item.toolCalls.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {item.toolCalls.map((tool, index) => (
              <span key={`${tool.id || tool.name || index}`} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                {tool.name || "tool"}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const LiveAssistant = memo(function LiveAssistant({ agent }: { agent: LiveAgent }) {
  const active = Boolean(agent.text || agent.reasoning || agent.toolCalls.size > 0);
  if (!active) return null;
  const streaming = agent.streaming;
  const tools = [...agent.toolCalls.entries()].map(([index, call]) => ({ index, id: call.id, name: call.name }));
  return (
    <div className="mb-7 flex items-start gap-3.5">
      <AgentAvatar streaming={streaming} />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline gap-2.5 px-0.5">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{humanAgent(agent.agent)}</span>
          {streaming && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-violet-500 dark:text-violet-300">
              <span className="size-1.5 animate-pulse rounded-full bg-violet-500" />
              streaming
            </span>
          )}
          <time className="ml-auto shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500" title={`event #${agent.firstSeq}`}>
            {fmtTime(agent.occurredAt)}
          </time>
        </div>
        <ThinkingStrip reasoning={agent.reasoning} streaming={streaming} />
        {tools.length > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {tools.map((tool) => (
              <span key={`${tool.index}-${tool.id}`} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                {tool.name || `tool ${tool.index}`}
              </span>
            ))}
          </div>
        )}
        {agent.text && <AssistantText text={agent.text} streaming={streaming} />}
        {!agent.text && !agent.reasoning && tools.length === 0 && (
          <p className="flex items-center gap-1.5 text-sm text-zinc-400 dark:text-zinc-500">
            <span className="size-3 animate-pulse rounded-full border-2 border-violet-400 border-t-transparent" />
            streaming…
          </p>
        )}
      </div>
    </div>
  );
});
