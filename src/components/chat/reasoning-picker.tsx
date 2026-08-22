import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";

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
  on: "On",
  "on:low": "On · low",
  "on:medium": "On · medium",
  "on:high": "On · high",
  "on:max": "On · max",
};

/** One-word chip labels — the full "On · high" form lives in the menu only. */
const CHIP_LABEL: Record<string, string> = {
  auto: "Auto",
  off: "Off",
  on: "On",
  "on:low": "Low",
  "on:medium": "Medium",
  "on:high": "High",
  "on:max": "Max",
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
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        title="Thinking / reasoning"
      >
        <Sparkles size={12} className={selectedReasoning === "on" ? "shrink-0 text-primary" : "shrink-0"} />
        <span className="whitespace-nowrap">{CHIP_LABEL[activeKey]}</span>
        <ChevronDown size={12} className={`shrink-0 text-muted-foreground/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 w-44 origin-bottom-left rounded-xl border border-border bg-popover p-1.5 shadow-xl`}
        >
          <div className="px-2 py-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
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
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {OPTION_LABEL[key]}
                  {isCurrent && <Check size={12} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}