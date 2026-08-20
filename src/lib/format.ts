export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Preview-serialize an arbitrary tool argument/result value. */
export function textOf(value: unknown, max: number): string {
  const text = stringify(value).trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function humanModel(model: string | undefined): string {
  if (!model) return "model";
  return model.includes("/") ? model.slice(model.indexOf("/") + 1) : model;
}

export function humanAgent(agent: string): string {
  return agent.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function hostnameOf(url: string, fallback = "Application"): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return fallback;
  }
}

/** Short label for a run in a notification: company, else role, else host. */
export function runAttentionLabel(run: { company?: string | null; role?: string | null; job_url: string }): string {
  return run.company || run.role || hostnameOf(run.job_url);
}

export function fmtTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDur(ms: number): string {
  if (ms <= 0) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function fmtNum(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value >= 10_000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
}
