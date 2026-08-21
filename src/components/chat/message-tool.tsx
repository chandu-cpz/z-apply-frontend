import { useState } from "react";
import { CheckCircle2, ChevronRight, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDur, humanModel, textOf } from "@/lib/format";
import type { ToolItem } from "@/lib/timeline/types";

/** Claude-style tool use: a single quiet row that expands into args/result.
 * No card chrome — the transcript stays text-first. */
export function ToolMessage({ item }: { item: ToolItem }) {
  const [open, setOpen] = useState(false);
  const failed = item.failed;
  const inFlight = item.inFlight;
  const hasDetails = Boolean(item.args || item.output || item.error);
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((value) => !value)}
        disabled={!hasDetails}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors",
          hasDetails ? "hover:bg-muted" : "cursor-default",
        )}
        aria-expanded={open}
      >
        {failed ? (
          <XCircle size={13} className="shrink-0 text-destructive" />
        ) : inFlight ? (
          <LoaderCircle size={13} className="shrink-0 animate-spin text-primary" />
        ) : (
          <CheckCircle2 size={13} className="shrink-0 text-success" />
        )}
        <span className="truncate font-mono text-[12.5px] leading-5 tabular-nums text-muted-foreground">
          {item.name.replaceAll("_", " ")}
        </span>
        {item.model && (
          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
            {humanModel(item.model)}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          {inFlight && <span className="text-primary">running…</span>}
          {failed && <span className="text-destructive">failed</span>}
          {item.durationMs > 0 && <span>{fmtDur(item.durationMs)}</span>}
        </span>
        {hasDetails && (
          <ChevronRight
            size={12}
            className={cn(
              "shrink-0 text-muted-foreground/70 transition-transform hover:text-muted-foreground",
              open && "rotate-90",
            )}
          />
        )}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 pl-5">
          {item.args && (
            <div className="min-w-0">
              <p className="mb-1 pl-0.5 text-[11px] text-muted-foreground">{textOf(item.args, 60) === item.args ? "" : "Args"}</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted/40 px-3 py-2 font-mono text-[12.5px] leading-5 tabular-nums whitespace-pre-wrap text-muted-foreground">
                {item.args}
              </pre>
            </div>
          )}
          {(item.output || item.error) && (
            <pre
              className={cn(
                "max-h-72 overflow-auto rounded-lg px-3 py-2 font-mono text-[12.5px] leading-5 tabular-nums whitespace-pre-wrap",
                failed
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted/40 text-muted-foreground",
              )}
            >
              {item.error || item.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
