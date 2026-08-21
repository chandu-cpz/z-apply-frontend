import type { PropsWithChildren } from "react";

/** Restrained liveness frame around the noVNC viewport: a faint iris ring
 * that reads as "the agent's workspace lives here" without competing with
 * the feed content. */
export function GlowFrame({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:border before:border-primary/15">
      {children}
    </div>
  );
}
