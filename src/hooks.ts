import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityEvent } from "./types";

export function useEventStream(): void {
  const client = useQueryClient();
  useEffect(() => {
    const source = new EventSource("/api/v1/events/stream");
    source.onmessage = (message) => applyEvent(client, JSON.parse(message.data) as ActivityEvent);
    for (const type of ["run.queued", "run.started", "run.terminal", "agent.started", "agent.completed", "tool.started", "tool.completed", "human.requested", "human.resolved", "browser.control_taken", "browser.control_returned"]) {
      source.addEventListener(type, (message) => applyEvent(client, JSON.parse((message as MessageEvent).data) as ActivityEvent));
    }
    return () => source.close();
  }, [client]);
}

function applyEvent(client: ReturnType<typeof useQueryClient>, event: ActivityEvent): void {
  client.setQueryData<ActivityEvent[]>(["events", event.run_id], (current = []) => current.some((item) => item.database_id === event.database_id) ? current : [...current, event]);
  if (event.type.startsWith("run.") || event.type.startsWith("browser.")) {
    void client.invalidateQueries({ queryKey: ["runs"] });
    void client.invalidateQueries({ queryKey: ["run", event.run_id] });
  }
  if (event.type.startsWith("human.")) void client.invalidateQueries({ queryKey: ["human", event.run_id] });
}
