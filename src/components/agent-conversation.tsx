import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../api";
import type { Run } from "../types";
import { MessageList } from "./chat/message-list";
import { Composer } from "./chat/composer";
import type { ReasoningEffort, ReasoningMode } from "./chat/reasoning-picker";

interface Props {
  run: Run;
  events: Parameters<typeof MessageList>[0]["events"];
  busy?: boolean;
  onSendContext(content: string): void;
  onStop?(): void;
  onAnswer?(requestId: string, answer: string): void;
  onDecide?(requestId: string, decision: "approve" | "reject"): void;
  onSwitchModel?(provider: string, model: string): void;
}

export function AgentConversation({ run, events, busy = false, onSendContext, onStop, onAnswer, onDecide, onSwitchModel }: Props) {
  const query = useQueryClient();
  const streaming = run.status === "running" || run.status === "starting";
  const status = streaming && run.current_model ? `Streaming · ${run.current_model.split("/").pop()}` : streaming ? "Streaming" : undefined;

  const switchModelMutation = useMutation({
    mutationFn: ({ provider, model }: { provider: string; model: string }) => api.switchModel(run.id, provider, model),
    onSuccess: (updatedRun) => {
      query.setQueryData(["run", run.id], updatedRun);
      query.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Active model updated", {
        description: `Switched to ${updatedRun.current_model || "new model"} for next steps.`,
      });
      if (onSwitchModel) onSwitchModel(updatedRun.current_agent || "", updatedRun.current_model || "");
    },
    onError: (error) => toast.error("Unable to switch model", { description: error.message }),
  });

  const handleSwitchModel = (provider: string, model: string) => {
    switchModelMutation.mutate({ provider, model });
  };

  const setReasoningMutation = useMutation({
    mutationFn: ({ reasoning, effort }: { reasoning: ReasoningMode; effort: ReasoningEffort | null }) =>
      api.setReasoning(run.id, reasoning, effort),
    onSuccess: (updatedRun) => {
      query.setQueryData(["run", run.id], updatedRun);
      query.invalidateQueries({ queryKey: ["runs"] });
      const label =
        updatedRun.current_reasoning === "on"
          ? `On · ${updatedRun.current_reasoning_effort || "high"}`
          : updatedRun.current_reasoning === "off"
            ? "Off"
            : "Auto";
      toast.success("Thinking updated", { description: `Reasoning set to ${label} for next steps.` });
    },
    onError: (error) => toast.error("Unable to change reasoning", { description: error.message }),
  });

  const handleSetReasoning = (reasoning: ReasoningMode, effort: ReasoningEffort | null) => {
    setReasoningMutation.mutate({ reasoning, effort });
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <MessageList runId={run.id} events={events} run={run} onAnswer={onAnswer} onDecide={onDecide} />
      </div>
      <Composer
        disabled={run.status === "terminal" || busy}
        streaming={streaming}
        status={status}
        selectedModel={run.current_model || undefined}
        selectedProvider={run.current_provider || undefined}
        selectedReasoning={run.current_reasoning}
        selectedReasoningEffort={run.current_reasoning_effort}
        onSwitchModel={handleSwitchModel}
        onSetReasoning={handleSetReasoning}
        placeholder={run.status === "terminal" ? "This run has ended" : "Steer the agent, correct a fact, or add context…"}
        onSend={onSendContext}
        onStop={onStop}
      />
    </section>
  );
}

