import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDur, fmtNum, fmtTime, humanAgent, humanModel } from "@/lib/format";
import type { LiveAgent } from "@/lib/live";
import type { TurnItem } from "@/lib/timeline/types";

export function AgentAvatar({ streaming = false }: { streaming?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-lg",
        streaming
          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500",
      )}
    >
      <Sparkles size={13} />
    </span>
  );
}

/** Live metrics as quiet dot-separated text — no pills. */
function LiveMeta({ agent }: { agent: LiveAgent }) {
  const metrics = agent.metrics;
  if (!metrics) return null;
  const parts: string[] = [];
  if (metrics.model) parts.push(humanModel(metrics.model));
  if (metrics.ttftMs > 0) parts.push(`ttft ${fmtDur(metrics.ttftMs)}`);
  if (metrics.tokPerSecond > 0) parts.push(`${metrics.tokPerSecond.toFixed(0)} tok/s`);
  if (metrics.outputTokens > 0) parts.push(`~${fmtNum(metrics.outputTokens)} tok`);
  if (parts.length === 0) return null;
  return <span className="hidden text-[11px] tabular-nums text-zinc-400 sm:inline dark:text-zinc-500">{parts.join(" · ")}</span>;
}

function ThinkingStrip({
  reasoning,
  streaming = false,
  durationMs,
}: {
  reasoning: string;
  streaming?: boolean;
  durationMs?: number;
}) {
  const [open, setOpen] = useState(true);
  if (!reasoning && !streaming) return null;
  const caption = streaming
    ? "Thinking…"
    : durationMs && durationMs > 0
      ? `Thought · ${fmtDur(durationMs)}`
      : "Thought";
  return (
    <div className="mb-2.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50"
        aria-expanded={open}
      >
        {streaming ? (
          <span className="size-2.5 shrink-0 animate-pulse rounded-full border-[1.5px] border-violet-400 border-t-transparent" />
        ) : (
          <ChevronRight size={12} className={cn("shrink-0 text-zinc-300 transition-transform dark:text-zinc-500", open && "rotate-90")} />
        )}
        <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{caption}</span>
        {!streaming && reasoning && (
          <span className="hidden max-w-64 truncate text-[11px] text-zinc-400 sm:inline dark:text-zinc-500">{reasoning}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-1.5 max-h-80 overflow-auto rounded-lg bg-zinc-50/90 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
              {reasoning}
              {streaming && <span className="animate-pulse text-violet-500">▍</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const markdownClass = [
  "text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200",
  "[&_p]:my-2.5 [&_li]:my-1",
  "[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_a]:text-violet-600 [&_a]:underline dark:[&_a]:text-violet-300",
  "[&_pre]:my-2.5 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-zinc-950 [&_pre]:p-3.5 [&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:text-zinc-100",
  "[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-zinc-800 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-100",
].join(" ");

function AssistantText({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div className="text-pretty">
      <div className={markdownClass}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      {streaming && (
        <span className="ml-0.5 inline-block h-[1.05em] w-[2.5px] translate-y-[2px] animate-z-blink rounded-[1px] bg-zinc-600 dark:bg-zinc-300" aria-hidden />
      )}
    </div>
  );
}

function MessageHeader({ agent, model, streaming, occurredAt, seq, liveMeta }: {
  agent: string;
  model?: string;
  streaming?: boolean;
  occurredAt: string;
  seq?: number;
  liveMeta?: React.ReactNode;
}) {
  return (
    <div className="mb-1 flex items-baseline gap-2 px-0.5">
      <span className="text-[13.5px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{humanAgent(agent)}</span>
      {model && <span className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{humanModel(model)}</span>}
      {streaming && (
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-violet-500 dark:text-violet-300">
          <span className="size-1 animate-pulse rounded-full bg-violet-500" />
          streaming
        </span>
      )}
      {liveMeta}
      <time className="ml-auto shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500" title={seq !== undefined ? `event #${seq}` : undefined}>
        {fmtTime(occurredAt)}
      </time>
    </div>
  );
}

export function TurnMessage({ item }: { item: TurnItem }) {
  const hasProse = Boolean(item.text.trim());
  const hasReasoning = Boolean(item.reasoning.trim());
  if (!hasProse && !hasReasoning) return null;
  return (
    <div className="mb-6 flex items-start gap-2.5">
      <div className="pt-0.5">
        <AgentAvatar />
      </div>
      <div className="min-w-0 flex-1">
        <MessageHeader agent={item.agent} model={item.model} occurredAt={item.occurredAt} seq={item.seq} />
        {hasReasoning && <ThinkingStrip reasoning={item.reasoning} durationMs={item.usage.durationMs} />}
        {hasProse && <AssistantText text={item.text} streaming={false} />}
        {item.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.toolCalls.map((tool, index) => (
              <span key={`${tool.id || tool.name || index}`} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
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
  const active = Boolean(agent.text || agent.reasoning || agent.toolCalls.size > 0 || agent.streaming);
  if (!active) return null;
  const streaming = agent.streaming;
  const tools = [...agent.toolCalls.entries()].map(([index, call]) => ({ index, id: call.id, name: call.name }));
  const waiting = streaming && !agent.text && !agent.reasoning && tools.length === 0;
  return (
    <div className="mb-6 flex items-start gap-2.5">
      <div className="pt-0.5">
        <AgentAvatar streaming={streaming} />
      </div>
      <div className="min-w-0 flex-1">
        <MessageHeader
          agent={agent.agent}
          model={agent.metrics?.model}
          streaming={streaming}
          occurredAt={agent.occurredAt}
          seq={agent.firstSeq}
          liveMeta={<LiveMeta agent={agent} />}
        />
        {waiting && (
          <>
            <style>{`
              @keyframes z-shimmer-sweep {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
              .z-shimmer-line {
                background: linear-gradient(90deg,
                  rgb(212 212 216 / 0.45) 25%,
                  rgb(244 244 245 / 0.9) 50%,
                  rgb(212 212 216 / 0.45) 75%);
                background-size: 200% 100%;
                animation: z-shimmer-sweep 1.4s linear infinite;
              }
              .dark .z-shimmer-line {
                background: linear-gradient(90deg,
                  rgb(39 39 42 / 0.45) 25%,
                  rgb(82 82 91 / 0.75) 50%,
                  rgb(39 39 42 / 0.45) 75%);
                background-size: 200% 100%;
              }
            `}</style>
            <div className="flex flex-col gap-2 py-1" aria-label="thinking">
              <div className="z-shimmer-line h-2.5 w-11/12 rounded-full" />
              <div className="z-shimmer-line h-2.5 w-8/12 rounded-full" />
              <div className="z-shimmer-line h-2.5 w-10/12 rounded-full" />
            </div>
          </>
        )}
        <ThinkingStrip reasoning={agent.reasoning} streaming={streaming} durationMs={agent.metrics?.durationMs} />
        {tools.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {tools.map((tool) => (
              <span key={`${tool.index}-${tool.id}`} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {tool.name || `tool ${tool.index}`}
              </span>
            ))}
          </div>
        )}
        {agent.text && <AssistantText text={agent.text} streaming={streaming} />}
        {!agent.text && !agent.reasoning && tools.length === 0 && (
          <p className="flex items-center gap-1.5 text-[13px] text-zinc-400 dark:text-zinc-500">
            <span className="size-2.5 animate-pulse rounded-full border-[1.5px] border-violet-400 border-t-transparent" />
            streaming…
          </p>
        )}
      </div>
    </div>
  );
});
