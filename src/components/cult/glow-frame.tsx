import type { PropsWithChildren } from "react";

/** Restrained Cult UI-inspired glow treatment for high-attention operational regions. */
export function GlowFrame({ children }: PropsWithChildren) { return <div className="relative h-full before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-sky-300/20 before:shadow-inner before:shadow-sky-950/50">{children}</div>; }
