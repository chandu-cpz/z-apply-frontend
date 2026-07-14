export type RunStatus = "queued" | "starting" | "running" | "waiting_human" | "human_control" | "terminal";

export interface Run {
  id: string; job_url: string; task: string; company: string | null; role: string | null;
  status: RunStatus; phase: string; outcome: string | null; summary: string | null;
  current_agent: string | null; current_model: string | null; browser_tab_state: string;
  latest_run_sequence: number; created_at: string; started_at: string | null; finished_at: string | null;
}

export interface ActivityEvent {
  database_id: number; run_id: string; sequence: number; occurred_at: string;
  type: string; source: Record<string, string>; level: "info" | "warning" | "error";
  payload: Record<string, unknown>;
}

export interface HumanRequest {
  request_id: string; kind: string; question: string; context: string; options: string[];
  risk: string; allow_free_text: boolean; status: string; answer?: string; approved?: boolean;
}

export interface LiveView { available: boolean; websocket_url?: string; control_mode: "agent_control" | "human_control"; focused_run_id: string | null; }
