import { useEffect, useRef } from "react";

interface Props { websocketUrl?: string; viewOnly: boolean; }

/** One long-lived noVNC client. It changes mode, rather than reconnecting per selected run. */
export function NoVncCanvas({ websocketUrl, viewOnly }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const client = useRef<{ viewOnly: boolean; disconnect(): void } | undefined>(undefined);
  const viewOnlyRef = useRef(viewOnly);
  useEffect(() => { viewOnlyRef.current = viewOnly; }, [viewOnly]);
  useEffect(() => {
    if (!host.current || !websocketUrl || client.current) return;
    let active = true;
    void import("@novnc/novnc").then(({ default: RFB }) => {
      if (!active || !host.current) return;
      const rfb = new RFB(host.current, websocketUrl, { credentials: {} });
      rfb.viewOnly = viewOnlyRef.current;
      rfb.scaleViewport = true;
      client.current = rfb;
    });
    return () => { active = false; client.current?.disconnect(); client.current = undefined; };
  }, [websocketUrl]);
  useEffect(() => { if (client.current) client.current.viewOnly = viewOnly; }, [viewOnly]);
  return <div ref={host} className="h-full w-full" aria-label="Live browser workspace" />;
}
