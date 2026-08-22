import { Maximize2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props { websocketUrl?: string; viewOnly: boolean; }

/** One long-lived noVNC client. It changes mode, rather than reconnecting per selected run. */
export function NoVncCanvas({ websocketUrl, viewOnly }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const client = useRef<{ viewOnly: boolean; disconnect(): void } | undefined>(undefined);
  const viewOnlyRef = useRef(viewOnly);
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "failed">("connecting");
  useEffect(() => { viewOnlyRef.current = viewOnly; }, [viewOnly]);
  useEffect(() => {
    if (!host.current || !websocketUrl || client.current) return;
    let active = true;
    setStatus("connecting");
    void import("@novnc/novnc").then(({ default: RFB }) => {
      if (!active || !host.current) return;
      const rfb = new RFB(host.current, websocketUrl, { credentials: {} });
      rfb.viewOnly = viewOnlyRef.current;
      rfb.scaleViewport = true;
      rfb.addEventListener("connect", () => setStatus("connected"));
      rfb.addEventListener("disconnect", () => setStatus("disconnected"));
      rfb.addEventListener("securityfailure", () => setStatus("failed"));
      rfb.addEventListener("credentialsrequired", () => setStatus("failed"));
      client.current = rfb;
    });
    return () => { active = false; client.current?.disconnect(); client.current = undefined; };
  }, [websocketUrl, generation]);
  useEffect(() => { if (client.current) client.current.viewOnly = viewOnly; }, [viewOnly]);
  return <div className="relative h-full min-h-0 w-full overflow-hidden"><div ref={host} className="h-full min-h-0 w-full overflow-hidden [&>*]:max-h-full [&>*]:max-w-full [&_canvas]:object-contain" aria-label="Live browser workspace"/><div className="pointer-events-none absolute top-2 left-2 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-foreground/80 backdrop-blur-sm">{status} · {viewOnly ? "watch" : "control"}</div><div className="absolute top-2 right-2 flex gap-1"><button className="grid size-7 place-items-center rounded-md border border-border/60 bg-background/80 text-foreground/80 backdrop-blur-sm hover:bg-background hover:text-foreground" onClick={() => setGeneration((value) => value + 1)} title="Reconnect browser view"><RefreshCw size={13}/></button><button className="grid size-7 place-items-center rounded-md border border-border/60 bg-background/80 text-foreground/80 backdrop-blur-sm hover:bg-background hover:text-foreground" onClick={() => void host.current?.requestFullscreen()} title="Fullscreen browser"><Maximize2 size={13}/></button></div></div>;
}
