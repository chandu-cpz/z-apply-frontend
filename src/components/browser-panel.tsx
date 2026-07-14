import { Expand, Eye, Focus, LockKeyhole, MonitorUp, MousePointer2, RefreshCw, ShieldCheck } from "lucide-react";
import type { LiveView, Run } from "../types";
import { GlowFrame } from "./cult/glow-frame";
import { NoVncCanvas } from "./no-vnc-canvas";

interface Props { run: Run; live?: LiveView; onFocus(): void; onControl(): void; onReturn(): void; }

export function BrowserPanel({ run, live, onFocus, onControl, onReturn }: Props) {
  const human = live?.control_mode === "human_control";
  return <section className={`relative grid min-h-0 grid-rows-[auto_1fr_auto_auto] overflow-hidden rounded-xl border bg-slate-900 ${human ? "border-amber-300" : "border-slate-700"}`}>
    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-cyan-300 shadow-sm shadow-cyan-300"/><div><b className="block text-sm text-zinc-100">Shared Camoufox workspace</b><small className="mt-1 block font-mono text-[10px] text-zinc-500">{live?.available ? "Live surface connected" : "Waiting for browser workspace"}</small></div></div><div className="flex gap-1"><IconButton title="Focus run" onClick={onFocus}><Focus size={15}/></IconButton><IconButton title="Reconnect"><RefreshCw size={15}/></IconButton><IconButton title="Fullscreen"><Expand size={15}/></IconButton></div></div>
    {human && <div className="flex items-center gap-2 bg-amber-200 px-4 py-2.5 text-xs text-amber-950"><MousePointer2 size={15}/><b>You control the browser</b><span className="opacity-75">Agent mutations are paused.</span></div>}
    <GlowFrame><div className="relative grid min-h-0 place-items-center overflow-hidden bg-gradient-to-br from-slate-700 to-slate-950">{live?.websocket_url ? <NoVncCanvas websocketUrl={live.websocket_url} viewOnly={!human}/> : <div className="max-w-[280px] p-5 text-center"><div className="mx-auto mb-4 grid size-16 place-items-center rounded-full border border-sky-200 text-sky-100 shadow-lg shadow-sky-950"><MonitorUp size={29}/></div><h2 className="text-lg font-medium tracking-tight text-slate-100">{live?.available ? "Browser view ready" : "Workspace warming up"}</h2><p className="my-2 text-[11px] leading-relaxed text-slate-300">{live?.available ? "The focused run is displayed through your local noVNC bridge." : "A persistent local browser appears here after the run reaches setup."}</p><div className="flex justify-center gap-1.5"><Meta><Eye size={13}/>{run.browser_tab_state}</Meta><Meta><ShieldCheck size={13}/>{human ? "human control" : "agent control"}</Meta></div></div>}</div></GlowFrame>
    <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500"><span>Focused <b className="font-medium text-zinc-200">{run.company || "application"}</b></span>{human ? <button className="rounded-md bg-violet-600 px-3 py-2 text-xs font-bold text-violet-50" onClick={onReturn}>Return to agent</button> : <button className="flex items-center gap-1.5 rounded-md border border-violet-500 bg-violet-600 px-3 py-2 text-xs text-violet-50" onClick={onControl}><MousePointer2 size={14}/> Take control</button>}</div>
    {!human && <div className="flex items-center justify-center gap-1.5 border-t border-zinc-800 bg-zinc-950 py-2 font-mono text-[10px] text-zinc-600"><LockKeyhole size={13} /> View only until you take control</div>}
  </section>;
}

function IconButton({ children, title, onClick }: React.PropsWithChildren<{ title: string; onClick?: () => void }>) { return <button className="grid size-8 place-items-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800" title={title} onClick={onClick}>{children}</button>; }
function Meta({ children }: React.PropsWithChildren) { return <span className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[10px] uppercase text-zinc-300">{children}</span>; }
