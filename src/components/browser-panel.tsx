import { Eye, EyeOff, Focus, LockKeyhole, MonitorUp, MousePointer2, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { LiveView, Run } from "../types";
import { GlowFrame } from "./cult/glow-frame";
import { NoVncCanvas } from "./no-vnc-canvas";

interface Props { run: Run; live?: LiveView; returning?: boolean; busy?: boolean; onFocus(): void; onControl(): void; onReturn(): void; onClose(): void; }

/** The backend builds the WS URL from the request Host, but the Vite proxy rewrites Host to 127.0.0.1:8000,
 *  so remote clients (e.g. phone on Tailscale) receive a URL pointing at themselves. Rebuild it against the
 *  page origin; Vite forwards /api including WebSockets to the backend. */
function reachableWsUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

export function BrowserPanel({ run, live, returning = false, busy = false, onFocus, onControl, onReturn, onClose }: Props) {
  const human = live?.control_mode === "human_control" && live.focused_run_id === run.id && !returning;
  const websocketUrl = reachableWsUrl(live?.websocket_url);
  const anotherRunControlled = live?.control_mode === "human_control" && live.focused_run_id !== run.id;
  const focused = live?.focused_run_id === run.id;
  const canControl = run.status !== "terminal" && run.browser_tab_state === "open" && Boolean(live?.available);
  const canClose = run.status === "terminal" && run.browser_tab_state === "open";
  const title = live?.available ? "Browser connected" : "Browser workspace";
  // Only the FOCUSED run's live browser is shown in the panel: selecting a
  // run focuses it (backend follows), so the panel always shows the run being
  // viewed and never a different run's screen.
  const showLive = focused && Boolean(websocketUrl);
  // An active run with an open workspace but no streaming frame is NOT a
  // closed workspace — say so explicitly instead of showing an empty frame
  // that reads as closure.
  const activeOpen = run.status !== "terminal" && run.browser_tab_state === "open";
  const feedUnavailable = activeOpen && !showLive;
  const waiting = run.status === "waiting_human" || run.status === "human_control";
  return (
    <section className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card ${human ? "border-warning/40" : "border-border"}`}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${showLive ? "animate-pulse bg-success" : feedUnavailable ? "animate-pulse bg-warning" : "bg-muted-foreground/40"}`} /><div><h2 className="text-xs font-semibold text-foreground">{title}</h2><p className="mt-0.5 text-[10px] text-muted-foreground">{human ? "You control this workspace" : feedUnavailable ? "Feed not streaming — the agent may still be working" : "View-only while the agent works"}</p></div></div>
        <div className="flex gap-1">{canControl && <IconButton disabled={busy} title="Focus this application" onClick={onFocus}><Focus size={15} /></IconButton>}{canClose && <IconButton disabled={busy} title="Close completed run browser" onClick={onClose}><X size={15}/></IconButton>}</div>
      </header>
      {human && <div className="flex items-center gap-2 border-l-2 border-warning bg-warning/15 px-4 py-2 text-xs text-warning"><MousePointer2 size={14} /> You have browser control. Agent actions are paused.</div>}
      {anotherRunControlled && <div className="bg-primary/10 px-4 py-2 text-xs text-primary">Another application currently owns human control.</div>}
      <GlowFrame><div className={`relative grid h-full min-h-0 flex-1 place-items-center ${showLive ? "bg-black" : feedUnavailable ? "bg-warning/5" : "bg-muted/40"}`}>{showLive ? <NoVncCanvas websocketUrl={websocketUrl} viewOnly={!human} /> : feedUnavailable ? <FeedUnavailable /> : <BrowserEmpty run={run} human={human} focused={focused} />}
        {waiting && showLive && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-24 items-end bg-gradient-to-t from-background/95 to-transparent pb-4 animate-in fade-in duration-300 motion-reduce:animate-none">
            <p className="ml-4 flex items-center gap-2 border-l-2 border-warning pl-2 text-[13px] font-medium leading-snug text-foreground">Agent paused before submitting — review the screen, then decide</p>
          </div>
        )}
      </div></GlowFrame>
      <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5"><span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{!human && !feedUnavailable && <LockKeyhole size={12} className="shrink-0" />}{feedUnavailable && <EyeOff size={12} className="shrink-0 text-warning" />}<span className="truncate">{feedUnavailable ? "Live feed unavailable — agent may still be working" : human ? "Interactive session — you have control" : focused ? "Viewing this run · view-only until you take control" : canControl ? "Focus required" : "No active browser"}</span></span><span className="flex shrink-0 items-center gap-1.5">{human ? <button disabled={busy} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={onReturn}>Return to agent</button> : canControl && !anotherRunControlled && <button disabled={busy} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={onControl}><MousePointer2 size={14} /> Take control</button>}</span></footer>
    </section>
  );
}

/** Amber honest state: the workspace exists but no frame is streaming.
 * Never let this read as a closed browser while the run is active. */
function FeedUnavailable() {
  return (
    <div className="max-w-xs border-l-2 border-warning bg-warning/10 p-4 text-left">
      <div className="flex items-center gap-2"><TriangleAlert className="text-warning" size={16} /><h3 className="text-sm font-semibold text-foreground">Live feed unavailable</h3></div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">The workspace is open, but no frames are streaming right now. The agent may still be working — check the activity timeline for current evidence.</p>
    </div>
  );
}

function BrowserEmpty({ run, human, focused }: { run: Run; human: boolean; focused: boolean }) {
  return <div className="max-w-xs text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm"><MonitorUp size={26} /></div><h3 className="text-base font-semibold text-foreground">{focused ? "Browser will appear here" : "Focus this application"}</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{focused ? "Start an application and its persistent browser will take over this workspace." : "Select this application to bring its browser into view."}</p><div className="mt-4 flex justify-center gap-2"><Badge><Eye size={12} /> Workspace: {run.browser_tab_state}</Badge><Badge><ShieldCheck size={12} /> {human ? "you control" : "agent controls"}</Badge></div></div>;
}

function IconButton({ children, title, disabled, onClick }: React.PropsWithChildren<{ title: string; disabled?: boolean; onClick?: () => void }>) { return <button className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40" title={title} disabled={disabled} onClick={onClick}>{children}</button>; }
function Badge({ children }: React.PropsWithChildren) { return <span className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-[10px] uppercase text-muted-foreground">{children}</span>; }
