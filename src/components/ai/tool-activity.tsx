import { Braces } from "lucide-react";
import type { ActivityEvent } from "../../types";

/** AI Elements-inspired operational renderer; intentionally excludes model reasoning. */
export function ToolActivity({ event }: { event: ActivityEvent }) {
  if (!event.type.includes("tool")) return null;
  return <div className="mt-2 flex items-center gap-2 rounded-md border border-cyan-950 bg-cyan-950/25 px-2 py-1.5 text-[10px] text-cyan-100"><Braces size={13} className="text-cyan-300"/><span className="font-mono">{event.type}</span><span className="ml-auto text-cyan-400/70">structured tool evidence</span></div>;
}
