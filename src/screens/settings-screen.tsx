import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleOff, Inbox } from "lucide-react";
import { api } from "../api";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { DataCard, PageShell } from "../components/page-shell";

export function SettingsScreen() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const documents = useQuery({ queryKey: ["documents"], queryFn: api.documents });
  const providers = useQuery({ queryKey: ["providers"], queryFn: api.providers });

  return (
    <PageShell
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
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">LLM Providers & Models</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Providers registered with Core. Set their corresponding environment variable to unlock them.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {providers.isLoading
            ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-xl" />)
            : (providers.data ?? []).map((provider) => (
            <div
              key={provider.name}
              className="flex flex-col justify-between rounded-xl border border-border bg-muted/40 p-3.5 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold capitalize text-foreground">
                    {provider.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {provider.is_default && (
                      <Badge className="bg-secondary text-secondary-foreground">active default</Badge>
                    )}
                    {provider.configured ? (
                      <Badge className="bg-success/10 text-success">configured</Badge>
                    ) : (
                      <Badge className="bg-warning/10 text-warning">missing key</Badge>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {provider.description}
                </p>
              </div>

              <div className="mt-3 border-t border-border pt-2 font-mono text-[12.5px] tabular-nums text-muted-foreground">
                <div className="flex justify-between">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">Default</span>
                  <span className="truncate">{provider.default_model}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">Env key</span>
                  <span className="text-foreground">{provider.env_key}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Candidate profile</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {profile.data?.summary || "Profile status unavailable."}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Documents</h2>
          {Array.isArray(documents.data) ? (
            documents.data.length ? (
              <ul className="mt-3 space-y-3">
                {documents.data.map((doc, index) => {
                  const { name, url, meta } = documentParts(doc);
                  return (
                    <li key={index} className="rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{name}</span>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center rounded-md px-1 py-0.5 text-xs font-medium text-primary hover:underline"
                          >
                            Download
                          </a>
                        )}
                      </div>
                      {meta && <p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <Inbox className="size-8 text-muted-foreground opacity-40" aria-hidden />
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  No documents were exposed by the backend.
                </p>
              </div>
            )
          ) : documents.data ? (
            <pre className="mt-3 overflow-auto rounded-lg bg-muted/40 p-3 font-mono text-[12.5px] tabular-nums text-muted-foreground">
              {JSON.stringify(documents.data, null, 2)}
            </pre>
          ) : (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <Inbox className="size-8 text-muted-foreground opacity-40" aria-hidden />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                No documents were exposed by the backend.
              </p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

const DOCUMENT_NAME_KEYS = ["name", "filename", "file_name", "title"];
const DOCUMENT_URL_KEYS = ["url", "download_url", "href", "link"];

/** documentSchema is a plain Record<string, string>; pick the friendliest
 * fields for display and fold the rest into one metadata line. */
function documentParts(doc: Record<string, string>) {
  const nameKey = DOCUMENT_NAME_KEYS.find((key) => key in doc);
  const urlKey = DOCUMENT_URL_KEYS.find((key) => key in doc);
  const meta = Object.entries(doc)
    .filter(([key]) => key !== nameKey && key !== urlKey)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
  return {
    name: (nameKey && doc[nameKey]) || Object.values(doc)[0] || "Untitled document",
    url: urlKey ? doc[urlKey] : undefined,
    meta,
  };
}

function Capability({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <DataCard
      label={label}
      value={
        <span
          className={`flex items-center gap-2 text-sm font-semibold ${
            enabled ? "text-success" : "text-muted-foreground"
          }`}
        >
          {enabled ? <CheckCircle2 size={15} className="shrink-0" /> : <CircleOff size={15} className="shrink-0" />}
          {enabled ? "Enabled" : "Unavailable"}
        </span>
      }
    />
  );
}
