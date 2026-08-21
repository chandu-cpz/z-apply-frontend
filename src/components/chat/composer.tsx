import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelCascadingPicker } from "../model-cascading-picker";
import { ReasoningPicker, type ReasoningEffort, type ReasoningMode } from "./reasoning-picker";

interface ComposerProps {
  disabled: boolean;
  streaming: boolean;
  placeholder: string;
  status?: string;
  selectedProvider?: string;
  selectedModel?: string;
  selectedReasoning?: ReasoningMode;
  selectedReasoningEffort?: ReasoningEffort | null;
  onSend(content: string): void;
  onStop?(): void;
  onSwitchModel?(provider: string, model: string): void;
  onSetReasoning?(reasoning: ReasoningMode, effort: ReasoningEffort | null): void;
}

const MAX_ROWS = 6;

export function Composer({
  disabled,
  streaming,
  placeholder,
  status,
  selectedProvider,
  selectedModel,
  selectedReasoning,
  selectedReasoningEffort,
  onSend,
  onStop,
  onSwitchModel,
  onSetReasoning,
}: ComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autosize 1–MAX_ROWS lines, Claude-style, without flicker.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, MAX_ROWS * 24 + 28);
    el.style.height = `${next}px`;
  }, [content]);

  const submit = () => {
    const value = content.trim();
    if (!value || disabled) return;
    onSend(value);
    setContent("");
  };

  const stop = () => {
    if (streaming && onStop) onStop();
  };

  return (
    <div className="shrink-0 px-5 pb-5">
      <div className="mx-auto w-full max-w-[760px] rounded-3xl border border-border bg-card shadow-sm transition focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
        <Textarea
          ref={textareaRef}
          value={content}
          maxLength={8000}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape" && streaming && onStop) {
              event.preventDefault();
              stop();
            }
          }}
          className="max-h-[172px] min-h-[44px] resize-none border-0 bg-transparent px-5 py-3.5 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {onSwitchModel && (
              <ModelCascadingPicker
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onSelect={onSwitchModel}
                variant="compact"
                direction="up"
                disabled={disabled}
              />
            )}
            {onSetReasoning && (
              <ReasoningPicker
                selectedReasoning={selectedReasoning}
                selectedEffort={selectedReasoningEffort}
                onSelect={onSetReasoning}
                direction="up"
                disabled={disabled}
              />
            )}
            {streaming ? (
              <>
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
                <span className="truncate">{status || "Streaming"} · Esc to stop</span>
              </>
            ) : (
              <span className="hidden truncate sm:inline">Shift+Enter for a new line</span>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={disabled || !content.trim()}
            title="Send"
            className="rounded-full"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

