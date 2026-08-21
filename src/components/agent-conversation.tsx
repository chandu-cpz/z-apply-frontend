import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { HelpCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api";
import type { Run } from "../types";
import { buildTimeline } from "../lib/timeline/build";
import type { TimelineItem } from "../lib/timeline/types";
import { MessageList } from "./chat/message-list";
import { Composer } from "./chat/composer";
import type { ReasoningEffort, ReasoningMode } from "./chat/reasoning-picker";

type PendingRequest = Extract<TimelineItem, { kind: "human" | "submission" }>;

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

/** Collect still-unpaired HITL requests from the same timeline build the
 * thread uses. After pairHuman, unresolved requests keep their raw sub
 * ("requested" / "approval_requested") — anything else was already answered. */
function collectPendingRequests(items: TimelineItem[], into: PendingRequest[]): void {
  for (const item of items) {
    if (item.kind === "human" && item.sub === "requested") into.push(item);
    else if (item.kind === "submission" && item.sub === "approval_requested") into.push(item);
    else if (item.kind === "agent-segment") collectPendingRequests(item.items, into);
  }
}

/** The HITL moment, pinned between thread and composer: the machine paused
 * and asks permission. Surfaces the OLDEST still-pending request so it is
 * visible without scrolling regardless of thread position. */
function DecisionBar({ requests, onAnswer, onDecide }: { requests: PendingRequest[]; onAnswer?: Props["onAnswer"]; onDecide?: Props["onDecide"] }) {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const oldest = requests[0];
  const isSubmission = oldest.kind === "submission";
  const question = oldest.question || oldest.detail || (isSubmission ? "Submit this application?" : "The agent needs your input");
  const requestId = oldest.request_id;

  const answer = (value: string) => {
    if (!requestId || !onAnswer || !value.trim() || sending) return;
    setSending(true);
    onAnswer(requestId, value.trim());
  };
  const decide = (decision: "approve" | "reject") => {
    if (!requestId || !onDecide || sending) return;
    setSending(true);
    onDecide(requestId, decision);
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="alert"
      aria-label="Run paused for your decision"
      className="shrink-0 px-5 pb-3"
    >
      <div className="mx-auto w-full max-w-[760px] rounded-xl border border-warning/40 bg-approval shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-3">
          {isSubmission ? (
            <ShieldAlert size={13} className="shrink-0 text-destructive" />
          ) : (
            <HelpCircle size={13} className="shrink-0 text-warning" />
          )}
          <span className="truncate text-[11px] font-semibold tracking-wide text-warning">
            {isSubmission ? "Irreversible action — needs your approval" : "The agent needs your input"}
          </span>
          {requests.length > 1 && (
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10.5px] font-medium text-warning">
              {requests.length} pending
            </span>
          )}
        </div>
        <p className="px-4 pt-1.5 text-sm font-semibold leading-snug text-foreground">{question}</p>
        <div className="p-3">
          {isSubmission ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => decide("approve")}
                className="h-10 rounded-lg bg-destructive px-3 text-[13px] font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => decide("reject")}
                className="h-10 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ) : oldest.options && oldest.options.length > 0 ? (
            <div className="flex flex-col gap-2">
              {oldest.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={sending}
                  onClick={() => answer(option)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-left text-[13px] font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                answer(draft);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={sending}
                placeholder="Type your answer…"
                className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="h-10 shrink-0 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AgentConversation({ run, events, busy = false, onSendContext, onStop, onAnswer, onDecide, onSwitchModel }: Props) {
  const query = useQueryClient();
  const streaming = run.status === "running" || run.status === "starting";
  const waitingOnHuman = run.status === "waiting_human" || run.status === "human_control";
  // Same timeline build the thread uses; pending = requests pairHuman left unpaired.
  const pendingRequests = useMemo<PendingRequest[]>(() => {
    if (!waitingOnHuman) return [];
    const found: PendingRequest[] = [];
    collectPendingRequests(buildTimeline(events), found);
    return found.sort((left, right) => left.seq - right.seq);
  }, [events, waitingOnHuman]);
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
      {pendingRequests.length > 0 && <DecisionBar requests={pendingRequests} onAnswer={onAnswer} onDecide={onDecide} />}
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

