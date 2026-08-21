import type { PropsWithChildren, ReactNode } from "react";

export function PageShell({ title, description, action, children }: PropsWithChildren<{ title: string; description: string; action?: ReactNode }>) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </main>
  );
}

export function DataCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</div>
      {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
