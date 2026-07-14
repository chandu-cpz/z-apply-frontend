import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { toast } from "sonner";
import { Command, History, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "./api";
import { Activity as ActivityPanel } from "./components/activity";
import { BrowserPanel } from "./components/browser-panel";
import { HumanPanel } from "./components/human-panel";
import { RunTabs } from "./components/run-tabs";
import { StartRun } from "./components/start-run";
import { useEventStream } from "./hooks";
import type { Run } from "./types";

export function App() {
  const query = useQueryClient(); useEventStream();
  const runs = useQuery({ queryKey: ["runs"], queryFn: api.runs });
  const [selectedId, setSelectedId] = useState<string>();
  const selected = runs.data?.find((run) => run.id === selectedId) ?? runs.data?.find((run) => run.status !== "terminal") ?? runs.data?.[0];
  useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected, selectedId]);
  const create = useMutation({ mutationFn: ({ url, task }: { url: string; task: string }) => api.createRun(url, task), onSuccess: (run) => { query.setQueryData<Run[]>(["runs"], (old = []) => [run, ...old]); setSelectedId(run.id); toast.success("Application queued", { description: "The Core scheduler owns dispatch and browser allocation." }); }, onError: (error) => toast.error("Unable to start application", { description: error.message }) });
  return <div className="app-shell"><Header active={selected}/><RunTabs runs={runs.data ?? []} selected={selected?.id} onNew={() => setSelectedId(undefined)} onSelect={(run) => { setSelectedId(run.id); void api.focus(run.id).catch(() => undefined); }}/>{!selected || !selectedId ? <StartRun onSubmit={(url, task) => create.mutate({ url, task })}/> : <Cockpit run={selected}/>}</div>;
}

function Header({ active }: { active?: Run }) { return <header className="global-header"><a className="brand" href="/"><span className="brand-mark"><Command size={18}/></span><span>Z-APPLY <i>/ command deck</i></span></a><div className="global-status"><span className="network-dot"/> CORE ONLINE <b>{active?.current_model || "ROUTER READY"}</b></div><nav><button><History size={16}/> History</button><button><Settings size={16}/> Diagnostics</button></nav></header>; }

function Cockpit({ run }: { run: Run }) {
  const query = useQueryClient(); const events = useQuery({ queryKey: ["events", run.id], queryFn: () => api.events(run.id) }); const human = useQuery({ queryKey: ["human", run.id], queryFn: () => api.human(run.id) }); const live = useQuery({ queryKey: ["live"], queryFn: api.liveView, refetchInterval: 5_000 });
  const refresh = () => { void query.invalidateQueries({ queryKey: ["runs"] }); void query.invalidateQueries({ queryKey: ["run", run.id] }); void query.invalidateQueries({ queryKey: ["human", run.id] }); };
  const mutation = useMutation({ mutationFn: async (operation: () => Promise<unknown>) => operation(), onSuccess: refresh });
  const pending = human.data?.find((item) => item.status === "pending");
  const layout = useDefaultLayout({ id: "z-apply-cockpit", storage: localStorage });
  return <main className="cockpit"><section className="run-command-bar"><div><span className="eyebrow">ACTIVE APPLICATION</span><h1>{run.company || new URL(run.job_url).hostname.replace("www.", "")}</h1><p>{run.role || "Role intelligence in progress"} <span>•</span> {run.phase.replaceAll("_", " ")}</p></div><div className="run-vitals"><Vital label="STATUS" value={run.status.replaceAll("_", " ")}/><Vital label="AGENT" value={run.current_agent || "orchestrator"}/><Vital label="MODEL" value={run.current_model || "selecting"}/><button className="danger" onClick={() => mutation.mutate(() => api.cancel(run.id))}>Cancel run</button></div></section><Group orientation="horizontal" className="cockpit-panels" defaultLayout={layout.defaultLayout} onLayoutChanged={layout.onLayoutChanged}><Panel id="browser" defaultSize={60} minSize={35}><BrowserPanel run={run} live={live.data} onFocus={() => mutation.mutate(() => api.focus(run.id))} onControl={() => mutation.mutate(() => api.takeControl(run.id))} onReturn={() => mutation.mutate(() => api.returnControl(run.id))}/></Panel><Separator className="panel-separator"/><Panel id="operations" defaultSize={40} minSize={28}><div className="operations-stack"><ActivityPanel run={run} events={events.data ?? []}/><HumanPanel run={run} request={pending} onAnswer={(answer) => pending && mutation.mutate(() => api.answer(run.id, pending.request_id, answer))} onDecision={(decision) => pending && mutation.mutate(() => api.decide(run.id, pending.request_id, decision))}/></div></Panel></Group></main>;
}

function Vital({ label, value }: { label: string; value: string }) { return <div className="vital"><span>{label}</span><b>{value}</b></div>; }
