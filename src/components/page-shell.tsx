import type { PropsWithChildren, ReactNode } from "react";

export function PageShell({ eyebrow, title, description, action, children }: PropsWithChildren<{ eyebrow: string; title: string; description: string; action?: ReactNode }>) {
  return <main className="mx-auto max-w-7xl px-5 py-8"><header className="mb-7 flex items-end justify-between gap-6 border-b border-stone-200 pb-5 dark:border-zinc-800"><div><p className="font-mono text-[10px] tracking-[.16em] text-violet-600 dark:text-violet-300">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-zinc-400">{description}</p></div>{action}</header>{children}</main>;
}

export function DataCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><p className="font-mono text-[9px] tracking-[.14em] text-stone-400 uppercase dark:text-zinc-500">{label}</p><div className="mt-2 text-xl font-semibold text-stone-900 dark:text-zinc-100">{value}</div>{detail && <p className="mt-2 text-xs text-stone-500 dark:text-zinc-500">{detail}</p>}</div>;
}

