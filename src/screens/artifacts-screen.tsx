import { useQuery } from "@tanstack/react-query";
import { Download, FileArchive, FileJson, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { artifactUrl, isImageArtifact } from "../lib/artifacts";
import { hostnameOf } from "../lib/format";
import { PageShell } from "../components/page-shell";
import { useArtifacts, useSyncStore } from "../sync-store";
import { cn } from "../lib/utils";
import type { Artifact, Run } from "../types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";

export function ArtifactsScreen({ runs }: { runs: Run[] }) {
  const [runId, setRunId] = useState(runs[0]?.id ?? "");
  const selectedRunId = runId || runs[0]?.id || "";
  const [activeKinds, setActiveKinds] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<Artifact | null>(null);
  // Bootstrap once per selected run; live updates arrive via artifact.created
  // events through the sync store.
  const artifactsQuery = useQuery({
    queryKey: ["run-artifacts", selectedRunId],
    queryFn: () => api.artifacts(selectedRunId),
    enabled: Boolean(selectedRunId),
    staleTime: Infinity,
  });
  useEffect(() => {
    if (artifactsQuery.data)
      useSyncStore.getState().seedArtifacts(selectedRunId, artifactsQuery.data);
  }, [selectedRunId, artifactsQuery.data]);
  const artifacts = useArtifacts(selectedRunId);
  const kinds = [...new Set(artifacts.map((artifact) => artifact.kind))];
  const visible =
    activeKinds.length === 0
      ? artifacts
      : artifacts.filter((artifact) => activeKinds.includes(artifact.kind));
  const toggleKind = (kind: string) =>
    setActiveKinds((current) =>
      current.includes(kind)
        ? current.filter((item) => item !== kind)
        : [...current, kind],
    );
  return (
    <PageShell
      eyebrow="EVIDENCE VAULT"
      title="Run artifacts"
      description="Screenshots, documents, and submission evidence exposed by Core for the selected application."
      action={
        <select
          className="max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
          value={selectedRunId}
          onChange={(event) => setRunId(event.target.value)}
        >
          {runs.map((run) => (
            <option value={run.id} key={run.id}>
              {run.company || hostnameOf(run.job_url)} · {run.role || run.phase}
            </option>
          ))}
        </select>
      }
    >
      {kinds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((kind) => (
            <button
              aria-pressed={activeKinds.includes(kind)}
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[10px] uppercase transition-colors",
                activeKinds.includes(kind)
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              key={kind}
              onClick={() => toggleKind(kind)}
              title={`Filter artifacts by kind: ${kind}`}
            >
              {kind}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((artifact) => (
          <ArtifactCard
            artifact={artifact}
            key={artifact.artifact_id}
            onOpen={() => setLightbox(artifact)}
          />
        ))}
      </div>
      {artifacts.length > 0 && visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No artifacts match the selected kind filters.
        </p>
      )}
      {artifactsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading run artifacts…</p>
      )}
      {artifactsQuery.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Artifacts are unavailable: {artifactsQuery.error.message}
        </p>
      )}
      {!artifactsQuery.isLoading && artifacts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No artifacts have been published for this run.
        </p>
      )}
      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => !open && setLightbox(null)}
      >
        {lightbox !== null && (
          <DialogContent className="sm:max-w-3xl">
            <DialogTitle className="truncate font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {lightbox.filename}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Full preview of {lightbox.filename} ({lightbox.kind}).
            </DialogDescription>
            {isImageArtifact(lightbox) ? (
              <img
                alt={lightbox.filename}
                className="max-h-[80vh] w-full object-contain"
                loading="lazy"
                src={artifactUrl(lightbox.artifact_id)}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid size-14 place-items-center rounded-xl bg-primary/10 text-primary">
                  {kindIcon(lightbox)}
                </span>
                <p className="truncate text-sm font-medium text-foreground">
                  {lightbox.filename}
                </p>
                <a
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary hover:opacity-90"
                  download
                  href={artifactUrl(lightbox.artifact_id)}
                  title="Download artifact"
                >
                  <Download size={13} />
                  Download
                </a>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </PageShell>
  );
}

function ArtifactCard({
  artifact,
  onOpen,
}: {
  artifact: Artifact;
  onOpen: () => void;
}) {
  const image = isImageArtifact(artifact);
  return (
    <article
      aria-label={`Preview ${artifact.filename}`}
      className="cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="relative grid aspect-[4/3] place-items-center bg-muted">
        {image ? (
          <img
            alt={artifact.filename}
            className="h-full w-full rounded-t-xl object-cover"
            loading="lazy"
            src={artifactUrl(artifact.artifact_id)}
          />
        ) : (
          <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
            {kindIcon(artifact)}
          </span>
        )}
        <a
          aria-label="Download artifact"
          className="absolute top-2 right-2 grid place-items-center rounded-md bg-background/80 p-1.5 text-muted-foreground backdrop-blur hover:text-primary"
          download
          href={artifactUrl(artifact.artifact_id)}
          onClick={(event) => event.stopPropagation()}
          title="Download artifact"
        >
          <Download size={15} />
        </a>
      </div>
      <div className="min-w-0 p-3">
        <h2 className="truncate text-sm font-medium">{artifact.filename}</h2>
        <p className="mt-1 truncate font-mono text-[10px] uppercase text-muted-foreground">
          {artifact.kind} · {formatBytes(artifact.size_bytes)} ·{" "}
          {formatDate(artifact.created_at)}
        </p>
      </div>
    </article>
  );
}

function kindIcon(artifact: Artifact) {
  if (artifact.mime_type === "application/json") return <FileJson size={22} />;
  if (artifact.mime_type.startsWith("text/")) return <FileText size={22} />;
  return <FileArchive size={22} />;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}
