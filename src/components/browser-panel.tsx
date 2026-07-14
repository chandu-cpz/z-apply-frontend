import { Eye, Focus, LockKeyhole, MonitorUp, MousePointer2, ShieldCheck, X } from "lucide-react";
import type { LiveView, Run } from "../types";
import { GlowFrame } from "./cult/glow-frame";
import { NoVncCanvas } from "./no-vnc-canvas";

interface Props { run: Run; live?: LiveView; returning?: boolean; busy?: boolean; onFocus(): void; onControl(): void; onReturn(): void; onClose(): void; }

export function BrowserPanel({ run, live, returning = false, busy = false, onFocus, onControl, onReturn, onClose }: Props) {
  const human = live?.control_mode === "human_control" && live.focused_run_id === run.id && !returning;
  const anotherRunControlled = live?.control_mode === "human_control" && live.focused_run_id !== run.id;
  const focused = live?.focused_run_id === run.id;
  const canControl = run.status !== "terminal" && run.browser_tab_state === "open" && Boolean(live?.available);
  const canClose = run.status === "terminal" && run.browser_tab_state === "open";
  const title = live?.available ? "Browser connected" : "Browser workspace";
  return (
    <section className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 ${human ? "border-amber-300" : "border-stone-200 dark:border-zinc-800"}`}>
      <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-cyan-500" /><div><h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">{title}</h2><p className="mt-0.5 font-mono text-[10px] text-stone-400 dark:text-zinc-500">{human ? "You control this workspace" : "View-only while the agent works"}</p></div></div>
        <div className="flex gap-1">{canControl && <IconButton disabled={busy} title="Focus this application" onClick={onFocus}><Focus size={15} /></IconButton>}{canClose && <IconButton disabled={busy} title="Close completed run browser" onClick={onClose}><X size={15}/></IconButton>}</div>
      </header>
      {human && <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"><MousePointer2 size={14} /> You have browser control. Agent actions are paused.</div>}
      {anotherRunControlled && <div className="bg-violet-100 px-4 py-2 text-xs text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">Another application currently owns human control.</div>}
      <GlowFrame><div className={`grid h-full min-h-0 flex-1 place-items-center ${live?.websocket_url ? "bg-slate-950" : "bg-stone-50 dark:bg-zinc-950"}`}>{live?.websocket_url ? <NoVncCanvas websocketUrl={live.websocket_url} viewOnly={!human} /> : <BrowserEmpty run={run} human={human} />}</div></GlowFrame>
      <footer className="flex items-center justify-between border-t border-stone-200 px-4 py-3 dark:border-zinc-800"><span className="text-xs text-stone-500 dark:text-zinc-500">{human ? "Interactive session" : focused ? "Viewing this run" : canControl ? "Focus required" : "No active browser"}</span>{human ? <button disabled={busy} className="rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50" onClick={onReturn}>Return to agent</button> : canControl && !anotherRunControlled && <button disabled={busy} className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50" onClick={onControl}><MousePointer2 size={14} /> Take control</button>}</footer>
      {!human && <div className="flex items-center justify-center gap-1.5 border-t border-stone-200 bg-stone-50 py-2 font-mono text-[10px] text-stone-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600"><LockKeyhole size={12} /> View-only until you take control</div>}
    </section>
  );
}

function BrowserEmpty({ run, human }: { run: Run; human: boolean }) {
  return <div className="max-w-xs text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-stone-200 bg-white text-violet-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><MonitorUp size={26} /></div><h3 className="text-base font-semibold text-stone-900 dark:text-zinc-100">Browser will appear here</h3><p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-zinc-500">Start an application and its persistent browser will take over this workspace.</p><div className="mt-4 flex justify-center gap-2"><Badge><Eye size={12} /> {run.browser_tab_state}</Badge><Badge><ShieldCheck size={12} /> {human ? "you control" : "agent controls"}</Badge></div></div>;
}

function IconButton({ children, title, disabled, onClick }: React.PropsWithChildren<{ title: string; disabled?: boolean; onClick?: () => void }>) { return <button className="grid size-8 place-items-center rounded-md border border-stone-200 bg-white text-stone-500 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800" title={title} disabled={disabled} onClick={onClick}>{children}</button>; }
function Badge({ children }: React.PropsWithChildren) { return <span className="flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 font-mono text-[10px] uppercase text-stone-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">{children}</span>; }
