import { z } from "zod";

export const runStatusSchema = z.enum([
  "queued",
  "starting",
  "running",
  "waiting_human",
  "human_control",
  "terminal",
]);

export const runSchema = z.object({
  id: z.string(),
  job_url: z.string(),
  task: z.string(),
  company: z.string().nullable(),
  role: z.string().nullable(),
  status: runStatusSchema,
  phase: z.string(),
  outcome: z.string().nullable(),
  summary: z.string().nullable(),
  current_agent: z.string().nullable(),
  current_model: z.string().nullable(),
  browser_tab_state: z.string(),
  latest_run_sequence: z.number().int().nonnegative(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
});

export const activityEventSchema = z.object({
  database_id: z.number().int().positive(),
  run_id: z.string(),
  sequence: z.number().int().nonnegative(),
  occurred_at: z.string(),
  type: z.string().min(1),
  source: z.record(z.string(), z.string()),
  level: z.enum(["info", "warning", "error"]),
  payload: z.record(z.string(), z.unknown()),
});

export const humanRequestSchema = z.object({
  request_id: z.string(),
  run_id: z.string().optional(),
  kind: z.string(),
  question: z.string(),
  context: z.string(),
  options: z.array(z.string()),
  risk: z.string(),
  allow_free_text: z.boolean(),
  image_artifact_id: z.string().nullable().optional(),
  status: z.string(),
  answer: z.string().nullable().optional(),
  approved: z.boolean().nullable().optional(),
  responder: z.string().nullable().optional(),
  created_at: z.string().optional(),
  resolved_at: z.string().nullable().optional(),
});

export const liveViewSchema = z.object({
  available: z.boolean(),
  websocket_url: z.string().optional(),
  vnc_host: z.string().nullable().optional(),
  vnc_port: z.number().int().nullable().optional(),
  control_mode: z.enum(["agent_control", "human_control"]),
  focused_run_id: z.string().nullable(),
});

export const artifactSchema = z.object({
  artifact_id: z.string(),
  run_id: z.string(),
  kind: z.string(),
  filename: z.string(),
  mime_type: z.string(),
  relative_path: z.string(),
  size_bytes: z.number().int().nonnegative(),
  sha256: z.string(),
  created_at: z.string(),
});

export const diagnosticsSchema = z.object({
  version: z.string(),
  max_active_runs: z.number().int(),
  active_runs: z.number().int(),
  live_view: z.boolean(),
  database: z.string(),
});

export const settingsSchema = z.object({
  max_active_runs: z.number().int(),
  telegram_enabled: z.boolean(),
  gmail_enabled: z.boolean(),
  simplify_enabled: z.boolean(),
});

export const profileSchema = z.object({ summary: z.string() });
export const documentSchema = z.record(z.string(), z.string());
export const contextMessageSchema = z.object({
  run_id: z.string(),
  content: z.string(),
  source: z.string(),
  accepted_at: z.string(),
});
