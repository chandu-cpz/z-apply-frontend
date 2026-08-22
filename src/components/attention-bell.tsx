import { useNavigate } from "@tanstack/react-router";
import { Bell, ChevronRight } from "lucide-react";
import { useState } from "react";
import { hostnameOf } from "@/lib/format";
import { getRunStatusMeta } from "@/lib/run-status";
import { useRuns } from "../sync-store";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

/** Header bell: every run paused for a human, one click to jump into it. */
export function AttentionBell() {
  const runs = useRuns();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const waiting = runs.filter((run) => run.status === "waiting_human" || run.status === "human_control");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`relative grid size-8 place-items-center rounded-md hover:bg-muted ${waiting.length > 0 ? "text-warning" : "text-muted-foreground hover:text-foreground"}`}
        title="Runs waiting on you"
      >
        <Bell size={15} />
        {waiting.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-warning px-1 text-[10px] font-semibold leading-none text-background tabular-nums">
            {waiting.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">Needs your attention</p>
        {waiting.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nothing needs you right now.</p>
        ) : (
          <div className="flex flex-col">
            {waiting.map((run) => {
              const meta = getRunStatusMeta(run);
              return (
                <button
                  key={run.id}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    void navigate({ to: "/runs/$runId", params: { runId: run.id } });
                  }}
                >
                  <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${meta.dot}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{run.company || hostnameOf(run.job_url)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{run.role || run.phase}</span>
                  </span>
                  <ChevronRight size={14} className="ml-auto shrink-0 self-center text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
