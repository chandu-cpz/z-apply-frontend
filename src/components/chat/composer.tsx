import { useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ComposerProps {
  disabled: boolean;
  streaming: boolean;
  placeholder: string;
  onSend(content: string): void;
  onStop?(): void;
}

export function Composer({ disabled, streaming, placeholder, onSend, onStop }: ComposerProps) {
  const [content, setContent] = useState("");
  const submit = () => {
    const value = content.trim();
    if (!value || disabled || streaming) return;
    onSend(value);
    setContent("");
  };
  return (
    <div className="shrink-0 px-5 pb-5">
      <div className="mx-auto w-full max-w-[760px] rounded-3xl border border-zinc-200 bg-white shadow-sm transition focus-within:border-zinc-300 focus-within:ring-4 focus-within:ring-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-zinc-700 dark:focus-within:ring-zinc-900">
        <Textarea
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
            }
          }}
          className="min-h-[44px] resize-none border-0 bg-transparent px-5 py-3.5 text-[15px] leading-relaxed shadow-none placeholder:text-zinc-400 focus-visible:ring-0 dark:placeholder:text-zinc-500"
        />
        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Shift+Enter for a new line</span>
          {streaming && onStop ? (
            <Button type="button" size="icon" variant="outline" onClick={onStop} title="Stop streaming" className="rounded-full">
              <Square size={14} className="fill-current" />
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
