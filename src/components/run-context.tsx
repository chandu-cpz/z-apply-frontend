import { Ban, BriefcaseBusiness, CircleCheck, ExternalLink, Gauge, Sparkles } from "lucide-react";
import type { Run } from "../types";

export function RunContext({ run, onCancel }: { run: Run; onCancel(): void }) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-zinc-950 p-4 text-zinc-100">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[.14em] text-zinc-500">RUN CONTEXT</span>
        <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase ${statusTone(run.status)}`}>{run.status.replaceAll("_", " ")}</span>
      </div>
      <div className="my-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-zinc-800 text-zinc-200"><BriefcaseBusiness size={19} /></span>
        <div className="min-w-0"><h2 className="truncate text-base font-semibold tracking-tight">{run.company || hostname(run.job_url)}</h2><p className="mt-1 truncate text-xs text-zinc-500">{run.role || "Role details loading"}</p></div>
      </div>
      <a className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white" href={run.job_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> View source job</a>
      <section className="mt-6">
        <span className="font-mono text-[10px] tracking-[.14em] text-zinc-500">CURRENTLY</span>
        <div className="mt-2 flex gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-violet-300"><Sparkles size={16} /><div className="min-w-0"><b className="block truncate text-sm text-zinc-100 capitalize">{run.current_agent || "Orchestrator"}</b><p className="mt-0.5 truncate text-xs text-zinc-500 capitalize">{run.phase.replaceAll("_", " ")}</p></div></div>
      </section>
      <section className="mt-6">
        <span className="font-mono text-[10px] tracking-[.14em] text-zinc-500">RUN SIGNALS</span>
        <dl className="mt-2 divide-y divide-zinc-800">
          <Signal icon={<Gauge size={14} />} label="Model" value={run.current_model || "Selecting"} />
          <Signal icon={<CircleCheck size={14} />} label="Browser" value={run.browser_tab_state.replaceAll("_", " ")} />
          <Signal label="SEQ" value={`#${run.latest_run_sequence}`} />
        </dl>
      </section>
      {run.summary && <section className="mt-6"><span className="font-mono text-[10px] tracking-[.14em] text-zinc-500">LATEST SUMMARY</span><p className="mt-2 text-xs leading-relaxed text-zinc-400">{run.summary}</p></section>}
      {run.status !== "terminal" && <button className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-rose-900 bg-rose-950/50 px-3 py-2.5 text-[11px] text-rose-200 transition hover:bg-rose-950" onClick={onCancel}><Ban size={15} /> Cancel application</button>}
    </aside>
  );
}

function Signal({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-2 py-2.5"><dt className="flex items-center gap-1.5 text-xs text-zinc-500">{icon}{label}</dt><dd className="max-w-[55%] truncate font-mono text-xs capitalize text-zinc-200">{value}</dd></div>;
}

function statusTone(status: Run["status"]): string {
  if (status === "running" || status === "starting") return "border-sky-400/40 text-sky-200";
  if (status === "waiting_human") return "border-amber-300/40 text-amber-200";
  return "border-zinc-800 text-zinc-400";
}

function hostname(url: string): string { try { return new URL(url).hostname.replace("www.", ""); } catch { return "Application"; } }
