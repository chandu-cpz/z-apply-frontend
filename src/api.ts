import type { ActivityEvent, HumanRequest, LiveView, Run } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail?.code ?? `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const api = {
  runs: () => request<Run[]>("/api/v1/runs"),
  run: (id: string) => request<Run>(`/api/v1/runs/${id}`),
  events: (id: string) => request<ActivityEvent[]>(`/api/v1/runs/${id}/events`),
  human: (id: string) => request<HumanRequest[]>(`/api/v1/runs/${id}/human-requests`),
  liveView: () => request<LiveView>("/api/v1/browser/live-view"),
  createRun: (job_url: string, task?: string) => request<Run>("/api/v1/runs", { method: "POST", body: JSON.stringify({ job_url, task: task || null }) }),
  cancel: (id: string) => request<Run>(`/api/v1/runs/${id}/cancel`, { method: "POST" }),
  focus: (id: string) => request<Run>(`/api/v1/runs/${id}/focus`, { method: "POST" }),
  takeControl: (run_id: string) => request<unknown>("/api/v1/browser/take-control", { method: "POST", body: JSON.stringify({ run_id }) }),
  returnControl: (run_id: string) => request<unknown>("/api/v1/browser/return-control", { method: "POST", body: JSON.stringify({ run_id }) }),
  answer: (runId: string, requestId: string, answer: string) => request<unknown>(`/api/v1/runs/${runId}/human-requests/${requestId}/answer`, { method: "POST", body: JSON.stringify({ answer }) }),
  decide: (runId: string, requestId: string, decision: "approve" | "reject") => request<unknown>(`/api/v1/runs/${runId}/human-requests/${requestId}/submission-decision`, { method: "POST", body: JSON.stringify({ decision }) }),
};
