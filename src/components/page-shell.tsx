import type { PropsWithChildren, ReactNode } from "react";

export function PageShell({ eyebrow, title, description, action, children }: PropsWithChildren<{ eyebrow: string; title: string; description: string; action?: ReactNode }>) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6 dark:border-zinc-800">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-medium text-violet-600 dark:text-violet-300">{eyebrow}</p>}
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </main>
  );
}

export function DataCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{label}</p>
      <div className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
      {detail && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">{detail}</p>}
    </div>
  );
}
