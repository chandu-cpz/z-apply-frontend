import type { PropsWithChildren } from "react";

/** Restrained Cult UI-inspired glow treatment for high-attention operational regions. */
export function GlowFrame({ children }: PropsWithChildren) {
  return <div className="relative before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-cyan-300/20 before:shadow-[inset_0_0_28px_rgba(80,180,255,.07)]">{children}</div>;
}
