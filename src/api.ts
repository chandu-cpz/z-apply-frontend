import { z } from "zod";
import {
  activityEventSchema,
  artifactSchema,
  contextMessageSchema,
  diagnosticsSchema,
  documentSchema,
  humanRequestSchema,
  liveViewSchema,
  profileSchema,
  runSchema,
  settingsSchema,
} from "./schemas";

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ detail: z.object({ code: z.string() }) }).safeParse(body);
    throw new Error(parsed.success ? parsed.data.detail.code : `Request failed (${response.status})`);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error(`Invalid response from ${path}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
  return parsed.data;
}

const acknowledgementSchema = z.record(z.string(), z.unknown());

export const api = {
  runs: () => request("/api/v1/runs", z.array(runSchema)),
  run: (id: string) => request(`/api/v1/runs/${id}`, runSchema),
  events: (id: string) => request(`/api/v1/runs/${id}/events`, z.array(activityEventSchema)),
  human: (id: string) => request(`/api/v1/runs/${id}/human-requests`, z.array(humanRequestSchema)),
  artifacts: (id: string) => request(`/api/v1/runs/${id}/artifacts`, z.array(artifactSchema)),
  liveView: () => request("/api/v1/browser/live-view", liveViewSchema),
  diagnostics: () => request("/api/v1/diagnostics", diagnosticsSchema),
  settings: () => request("/api/v1/settings", settingsSchema),
  profile: () => request("/api/v1/profile", profileSchema),
  documents: () => request("/api/v1/documents", z.array(documentSchema)),
  createRun: (job_url: string, task?: string) => request("/api/v1/runs", runSchema, { method: "POST", body: JSON.stringify({ job_url, task: task || null }) }),
  sendContext: (runId: string, content: string) => request(`/api/v1/runs/${runId}/context`, contextMessageSchema, { method: "POST", body: JSON.stringify({ content }) }),
  cancel: (id: string) => request(`/api/v1/runs/${id}/cancel`, runSchema, { method: "POST" }),
  focus: (id: string) => request(`/api/v1/runs/${id}/focus`, runSchema, { method: "POST" }),
  closeBrowser: (id: string) => request(`/api/v1/runs/${id}/browser`, runSchema, { method: "DELETE" }),
  takeControl: (run_id: string) => request("/api/v1/browser/take-control", acknowledgementSchema, { method: "POST", body: JSON.stringify({ run_id }) }),
  returnControl: (run_id: string) => request("/api/v1/browser/return-control", acknowledgementSchema, { method: "POST", body: JSON.stringify({ run_id }) }),
  answer: (runId: string, requestId: string, answer: string) => request(`/api/v1/runs/${runId}/human-requests/${requestId}/answer`, humanRequestSchema, { method: "POST", body: JSON.stringify({ answer }) }),
  decide: (runId: string, requestId: string, decision: "approve" | "reject") => request(`/api/v1/runs/${runId}/human-requests/${requestId}/submission-decision`, humanRequestSchema, { method: "POST", body: JSON.stringify({ decision }) }),
};
