import { useEffect, useRef, useState } from "react";

export type ReasoningMode = "auto" | "off" | "on";
export type ReasoningEffort = "low" | "medium" | "high" | "max";

export interface ReasoningSelection {
  reasoning: ReasoningMode;
  reasoningEffort: ReasoningEffort | null;
}

interface Props {
  selectedReasoning?: ReasoningMode;
  selectedEffort?: ReasoningEffort | null;
  onSelect(reasoning: ReasoningMode, effort: ReasoningEffort | null): void;
  disabled?: boolean;
  direction?: "up" | "down";
}

const OPTIONS: ReasoningSelection[] = [
  { reasoning: "auto", reasoningEffort: null },
  { reasoning: "off", reasoningEffort: null },
  { reasoning: "on", reasoningEffort: "low" },
  { reasoning: "on", reasoningEffort: "medium" },
  { reasoning: "on", reasoningEffort: "high" },
  { reasoning: "on", reasoningEffort: "max" },
];

const OPTION_LABEL: Record<string, string> = {
  auto: "Auto",
  off: "Off",
  "on:low": "On · low",
  "on:medium": "On · medium",
  "on:high": "On · high",
  "on:max": "On · max",
};

function optionKey(option: ReasoningSelection): string {
  return option.reasoning === "on" && option.reasoningEffort
    ? `${option.reasoning}:${option.reasoningEffort}`
    : option.reasoning;
}

export function ReasoningPicker({
  selectedReasoning = "on",
  selectedEffort = null,
  onSelect,
  disabled = false,
  direction = "up",
}: Props) {
  const activeKey = optionKey({ reasoning: selectedReasoning, reasoningEffort: selectedEffort });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        title="Thinking / reasoning"
      >
        <span className="text-zinc-400 dark:text-zinc-500">Thinking</span>
        <span
          className={`font-mono uppercase tracking-wider text-[10px] ${
            selectedReasoning === "on"
              ? "text-violet-600 dark:text-violet-400"
              : selectedReasoning === "off"
                ? "text-zinc-400 dark:text-zinc-500"
                : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {OPTION_LABEL[activeKey]}
        </span>
        <span className="text-[9px] text-zinc-400">{isOpen ? "▴" : "▾"}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 w-44 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950`}
        >
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            Thinking
          </div>
          <div className="space-y-0.5">
            {OPTIONS.map((option) => {
              const key = optionKey(option);
              const isCurrent = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelect(option.reasoning, option.reasoningEffort);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    isCurrent
                      ? "bg-violet-50 font-medium text-violet-950 dark:bg-violet-950/40 dark:text-violet-200"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {OPTION_LABEL[key]}
                  {isCurrent && <span className="text-[10px] text-violet-500">•</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}