import type { Run } from "../types";
import { MessageList } from "./chat/message-list";
import { Composer } from "./chat/composer";

interface Props {
  run: Run;
  events: Parameters<typeof MessageList>[0]["events"];
  busy?: boolean;
  onSendContext(content: string): void;
  onStop?(): void;
  onAnswer?(requestId: string, answer: string): void;
  onDecide?(requestId: string, decision: "approve" | "reject"): void;
}

export function AgentConversation({ run, events, busy = false, onSendContext, onStop, onAnswer, onDecide }: Props) {
  const streaming = run.status === "running" || run.status === "starting";
  const status = streaming && run.current_model ? `Streaming · ${run.current_model.split("/").pop()}` : streaming ? "Streaming" : undefined;
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <MessageList runId={run.id} events={events} run={run} onAnswer={onAnswer} onDecide={onDecide} />
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
