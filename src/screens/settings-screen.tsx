import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleOff } from "lucide-react";
import { api } from "../api";
import { DataCard, PageShell } from "../components/page-shell";

export function SettingsScreen() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const documents = useQuery({ queryKey: ["documents"], queryFn: api.documents });
  return <PageShell eyebrow="LOCAL CONFIGURATION" title="Profile and settings" description="Read-only configuration reported by the backend. Runtime secrets and candidate data remain owned by Core."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DataCard label="Run capacity" value={settings.data?.max_active_runs ?? "—"} detail="Maximum concurrent applications"/><Capability label="Telegram HITL" enabled={settings.data?.telegram_enabled}/><Capability label="Gmail auth" enabled={settings.data?.gmail_enabled}/><Capability label="Simplify" enabled={settings.data?.simplify_enabled}/></div><section className="mt-6 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-sm font-semibold">Candidate profile</h2><p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">{profile.data?.summary || "Profile status unavailable."}</p></div><div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-sm font-semibold">Documents</h2>{documents.data?.length ? <pre className="mt-3 overflow-auto text-xs text-stone-500">{JSON.stringify(documents.data, null, 2)}</pre> : <p className="mt-3 text-sm text-stone-500">No documents were exposed by the backend.</p>}</div></section></PageShell>;
}

function Capability({ label, enabled }: { label: string; enabled?: boolean }) { return <DataCard label={label} value={<span className={`inline-flex items-center gap-2 text-base ${enabled ? "text-emerald-600" : "text-stone-400"}`}>{enabled ? <CheckCircle2 size={18}/> : <CircleOff size={18}/>} {enabled ? "Enabled" : "Unavailable"}</span>}/>; }

