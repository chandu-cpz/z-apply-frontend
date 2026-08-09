import { ShieldAlert } from "lucide-react";
import type { HumanRequest, Run } from "../types";
import { MessageList } from "./chat/message-list";
import { Composer } from "./chat/composer";

interface Props {
  run: Run;
  events: Parameters<typeof MessageList>[0]["events"];
  pendingRequests?: HumanRequest[];
  busy?: boolean;
  onSendContext(content: string): void;
  onStop?(): void;
}

export function AgentConversation({ run, events, pendingRequests, busy = false, onSendContext, onStop }: Props) {
  const streaming = run.status === "running" || run.status === "starting";
  const status = streaming && run.current_model ? `Streaming · ${run.current_model.split("/").pop()}` : streaming ? "Streaming" : undefined;
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <MessageList runId={run.id} events={events} run={run} />
      </div>
      <div className="shrink-0 px-5 pb-2">
        {pendingRequests && pendingRequests.length > 0 ? <HumanNeeded requests={pendingRequests} /> : null}
      </div>
      <Composer
        disabled={run.status === "terminal" || busy}
        streaming={streaming}
        status={status}
        placeholder={run.status === "terminal" ? "This run has ended" : "Steer the agent, correct a fact, or add context…"}
        onSend={onSendContext}
        onStop={onStop}
      />
    </section>
  );
}

function HumanNeeded({ requests }: { requests: HumanRequest[] }) {
  const count = requests.length;
  const heading = count === 1 ? "Your input is needed" : `${count} pending questions`;
  return (
    <article className="mx-auto w-full max-w-[760px]">
      <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
          <ShieldAlert size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{heading}</p>
          <p className="truncate text-[13px] text-amber-700/90 dark:text-amber-200/80">
            {count === 1 ? requests[0].question : "Answer each checkpoint to keep every paused step moving."}
          </p>
        </div>
      </div>
    </article>
  );
}

