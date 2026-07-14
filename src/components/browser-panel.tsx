import { Expand, Eye, Focus, MonitorUp, MousePointer2, RefreshCw, ShieldCheck } from "lucide-react";
import type { LiveView, Run } from "../types";
import { GlowFrame } from "./cult/glow-frame";
import { NoVncCanvas } from "./no-vnc-canvas";

interface Props { run: Run; live?: LiveView; onFocus(): void; onControl(): void; onReturn(): void; }

export function BrowserPanel({ run, live, onFocus, onControl, onReturn }: Props) {
  const human = live?.control_mode === "human_control";
  return <section className={`browser-panel panel ${human ? "human-control" : ""}`}>
    <div className="browser-toolbar"><div className="browser-identity"><span className="live-led"/><div><b>Shared Camoufox workspace</b><small>{live?.available ? "Live surface connected" : "Waiting for browser workspace"}</small></div></div><div className="toolbar-actions"><button title="Focus run" onClick={onFocus}><Focus size={16}/></button><button title="Reconnect"><RefreshCw size={16}/></button><button title="Fullscreen"><Expand size={16}/></button></div></div>
    {human && <div className="control-banner"><MousePointer2 size={16}/><b>You control the browser</b><span>Agent mutations are paused for this workspace.</span></div>}
    <GlowFrame><div className="browser-stage">{live?.websocket_url ? <NoVncCanvas websocketUrl={live.websocket_url} viewOnly={!human}/> : <><div className="scanlines"/><div className="browser-empty"><div className="orbital"><MonitorUp size={32}/></div><h2>{live?.available ? "Browser view ready" : "Workspace warming up"}</h2><p>{live?.available ? "The focused run is displayed through your local noVNC bridge." : "A persistent local browser appears here after the run reaches setup."}</p><div className="browser-meta"><span><Eye size={14}/> {run.browser_tab_state}</span><span><ShieldCheck size={14}/> {human ? "human control" : "agent control"}</span></div></div></>}</div></GlowFrame>
    <div className="browser-footer"><span>Focused run <b>{run.company || "unidentified employer"}</b></span>{human ? <button className="primary compact" onClick={onReturn}>Return to agent</button> : <button className="control-button" onClick={onControl}><MousePointer2 size={16}/> Take control</button>}</div>
  </section>;
}
