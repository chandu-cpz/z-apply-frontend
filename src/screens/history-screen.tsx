import { ArrowUpRight, CircleDot } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import type { Run } from "../types";
import { PageShell } from "../components/page-shell";

const ROW_HEIGHT = 57;

export function HistoryScreen({ runs, onOpen }: { runs: Run[]; onOpen(run: Run): void }) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    setScrollMargin(tableRef.current?.getBoundingClientRect().top ?? 0);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: runs.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  });
  return <PageShell eyebrow="RUN LEDGER" title="Application history" description="Durable run metadata from the backend. Open a run to inspect its replay, browser state, and artifacts.">
    <div className="grid gap-3 md:hidden">
      {runs.map((run) => (
        <button className="rounded-xl border border-stone-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900" key={run.id} onClick={() => onOpen(run)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <b className="block truncate text-sm text-stone-900 dark:text-zinc-100">{run.company || hostname(run.job_url)}</b>
              <span className="mt-0.5 block truncate text-xs text-stone-400">{run.role || run.job_url}</span>
            </div>
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><ArrowUpRight size={15}/></span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div><dt className="font-mono text-[9px] tracking-[.12em] text-stone-400 uppercase">State</dt><dd className="mt-0.5 flex items-center gap-1.5 font-medium"><CircleDot size={12} className={run.status === "waiting_human" ? "text-amber-500" : run.status === "terminal" ? "text-stone-400" : "text-cyan-500"} />{run.status.replaceAll("_", " ")}</dd></div>
            <div><dt className="font-mono text-[9px] tracking-[.12em] text-stone-400 uppercase">Phase</dt><dd className="mt-0.5 capitalize">{run.phase.replaceAll("_", " ")}</dd></div>
            <div><dt className="font-mono text-[9px] tracking-[.12em] text-stone-400 uppercase">Outcome</dt><dd className="mt-0.5 capitalize">{run.outcome?.replaceAll("_", " ") || "—"}</dd></div>
            <div><dt className="font-mono text-[9px] tracking-[.12em] text-stone-400 uppercase">Started</dt><dd className="mt-0.5 text-stone-500">{formatDate(run.started_at || run.created_at)}</dd></div>
          </dl>
        </button>
      ))}
    </div>
    <div ref={tableRef} className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-50 font-mono text-[9px] tracking-[.12em] text-stone-400 uppercase dark:bg-zinc-950 dark:text-zinc-500"><tr><th className="px-4 py-3">Application</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Phase</th><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">Started</th><th className="w-12"/></tr></thead>
        <tbody style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((row) => {
            const run = runs[row.index];
            return (
              <tr className="absolute top-0 left-0 w-full cursor-pointer border-t border-stone-100 hover:bg-violet-50/50 dark:border-zinc-800 dark:hover:bg-violet-950/20" key={run.id} style={{ height: `${row.size}px`, transform: `translateY(${row.start - scrollMargin}px)` }} onClick={() => onOpen(run)}>
                <td className="px-4 py-3"><b className="block text-sm text-stone-900 dark:text-zinc-100">{run.company || hostname(run.job_url)}</b><span className="mt-0.5 block text-stone-400">{run.role || run.job_url}</span></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><CircleDot size={12} className={run.status === "waiting_human" ? "text-amber-500" : run.status === "terminal" ? "text-stone-400" : "text-cyan-500"} />{run.status.replaceAll("_", " ")}</span></td>
                <td className="px-4 py-3 capitalize">{run.phase.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 capitalize">{run.outcome?.replaceAll("_", " ") || "—"}</td>
                <td className="px-4 py-3 text-stone-500">{formatDate(run.started_at || run.created_at)}</td>
                <td><span className="grid size-8 place-items-center rounded text-stone-400"><ArrowUpRight size={15}/></span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {runs.length === 0 && <p className="p-8 text-center text-sm text-stone-500">No applications have been recorded yet.</p>}
    </div>
    {runs.length === 0 && <p className="p-8 text-center text-sm text-stone-500 md:hidden">No applications have been recorded yet.</p>}
  </PageShell>;
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "Application"; } }
function formatDate(value: string): string { return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
