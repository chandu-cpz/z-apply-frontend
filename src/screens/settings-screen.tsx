import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleOff } from "lucide-react";
import { api } from "../api";
import { DataCard, PageShell } from "../components/page-shell";

export function SettingsScreen() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const documents = useQuery({ queryKey: ["documents"], queryFn: api.documents });
  const providers = useQuery({ queryKey: ["providers"], queryFn: api.providers });

  return (
    <PageShell
      eyebrow="LOCAL CONFIGURATION"
      title="Profile and settings"
      description="Read-only configuration reported by the backend. Runtime secrets and candidate data remain owned by Core."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard
          label="Run capacity"
          value={settings.data?.max_active_runs ?? "—"}
          detail="Maximum concurrent applications"
        />
        <Capability label="Telegram HITL" enabled={settings.data?.telegram_enabled} />
        <Capability label="Gmail auth" enabled={settings.data?.gmail_enabled} />
        <Capability label="Simplify" enabled={settings.data?.simplify_enabled} />
      </div>

      {/* Providers & Models Catalog */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">LLM Providers & Models</h2>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
              Providers registered with Core. Set their corresponding environment variable to unlock them.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(providers.data ?? []).map((provider) => (
            <div
              key={provider.name}
              className="flex flex-col justify-between rounded-xl border border-stone-200 bg-stone-50/50 p-3.5 transition dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-stone-900 capitalize dark:text-zinc-100">
                    {provider.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {provider.is_default && (
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[9px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                        active default
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-medium ${
                        provider.configured
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-stone-200 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {provider.configured ? "configured" : "missing key"}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-zinc-400">
                  {provider.description}
                </p>
              </div>

              <div className="mt-3 border-t border-stone-200/60 pt-2 font-mono text-[10px] text-stone-600 dark:border-zinc-800/80 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span className="text-stone-400 dark:text-zinc-500">Default:</span>
                  <span className="truncate">{provider.default_model}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-stone-400 dark:text-zinc-500">Env Key:</span>
                  <span className="text-stone-700 dark:text-zinc-300">{provider.env_key}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Candidate profile</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
            {profile.data?.summary || "Profile status unavailable."}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Documents</h2>
          {documents.data?.length ? (
            <pre className="mt-3 overflow-auto text-xs text-stone-500">
              {JSON.stringify(documents.data, null, 2)}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No documents were exposed by the backend.</p>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function Capability({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <DataCard
      label={label}
      value={
        <span
          className={`inline-flex items-center gap-2 text-base ${
            enabled ? "text-emerald-600" : "text-stone-400"
          }`}
        >
          {enabled ? <CheckCircle2 size={18} /> : <CircleOff size={18} />} {enabled ? "Enabled" : "Unavailable"}
        </span>
      }
    />
  );
}
