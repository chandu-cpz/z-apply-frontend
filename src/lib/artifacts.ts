import type { Artifact } from "../types";

/** Backend route that streams the raw bytes of a stored artifact. */
export function artifactUrl(artifactId: string): string {
  return `/api/v1/artifacts/${artifactId}`;
}

/** True when an artifact can be previewed as an image thumbnail. */
export function isImageArtifact(artifact: Artifact): boolean {
  return (
    artifact.kind.includes("screenshot") ||
    artifact.kind.includes("confirmation") ||
    /\.(png|jpe?g|webp)$/i.test(artifact.filename)
  );
}
