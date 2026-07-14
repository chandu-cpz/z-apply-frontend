import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from "react-resizable-panels";
import { Command, History, PanelLeftClose, PanelRightClose, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "./api";
import { AgentConversation } from "./components/agent-conversation";
import { BrowserPanel } from "./components/browser-panel";
import { HumanPanel } from "./components/human-panel";
import { RunContext } from "./components/run-context";
import { RunTabs } from "./components/run-tabs";
import { StartRun } from "./components/start-run";
import { useEventStream } from "./hooks";
import type { Run } from "./types";

export function App() {
  const query = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  useEventStream();

  const runs = useQuery({
    queryKey: ["runs"],
    queryFn: api.runs,
    refetchInterval: 5_000,
  });
  const selected = runs.data?.find((run) => run.id === selectedId)
    ?? runs.data?.find((run) => run.status !== "terminal")
    ?? runs.data?.[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const create = useMutation({
    mutationFn: ({ url, task }: { url: string; task: string }) => api.createRun(url, task),
    onSuccess: (run) => {
      query.setQueryData<Run[]>(["runs"], (old = []) => [run, ...old]);
      setSelectedId(run.id);
      toast.success("Application queued", {
        description: "The agent will report each browser action in the live conversation.",
      });
    },
    onError: (error) => toast.error("Unable to start application", { description: error.message }),
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header active={selected} />
      <RunTabs
        runs={runs.data ?? []}
        selected={selected?.id}
        onNew={() => setSelectedId(undefined)}
        onSelect={(run) => {
          setSelectedId(run.id);
          void api.focus(run.id).catch(() => undefined);
        }}
      />
      {!selected || !selectedId ? (
        <StartRun onSubmit={(url, task) => create.mutate({ url, task })} />
      ) : (
        <Cockpit run={selected} />
      )}
    </div>
  );
}

function Header({ active }: { active?: Run }) {
  return (
    <header className="flex h-15 items-center gap-7 border-b border-slate-800 bg-slate-950/95 px-7 backdrop-blur-xl">
      <a className="flex items-center gap-2.5 text-sm font-bold tracking-[.06em] text-slate-100" href="/">
        <span className="grid size-8 place-items-center rounded-lg border border-violet-400/60 bg-gradient-to-br from-violet-600 to-slate-800 text-violet-100 shadow-lg shadow-violet-950/50"><Command size={18} /></span>
        <span>Z-APPLY <i className="hidden font-mono text-[9px] font-normal tracking-[.1em] text-slate-400 sm:inline">/ local agent workspace</i></span>
      </a>
      <div className="ml-auto hidden font-mono text-[10px] tracking-[.08em] text-slate-400 md:block">
        <span className="mr-2 inline-block size-1.5 rounded-full bg-emerald-300 shadow-sm shadow-emerald-300" /> CORE ONLINE
        <b className="ml-2 text-violet-200">{active?.current_model || "ROUTER READY"}</b>
      </div>
      <nav className="hidden gap-1 sm:flex">
        <button className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-400 transition hover:text-white"><History size={16} /> History</button>
        <button className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-400 transition hover:text-white"><Settings size={16} /> Diagnostics</button>
      </nav>
    </header>
  );
}

function Cockpit({ run }: { run: Run }) {
  const query = useQueryClient();
  const leftPanel = usePanelRef();
  const rightPanel = usePanelRef();
  const layout = useDefaultLayout({ id: "z-apply-three-pane", storage: localStorage });
  const events = useQuery({
    queryKey: ["events", run.id],
    queryFn: () => api.events(run.id),
    refetchInterval: 3_000,
  });
  const human = useQuery({
    queryKey: ["human", run.id],
    queryFn: () => api.human(run.id),
    refetchInterval: 3_000,
  });
  const live = useQuery({
    queryKey: ["live"],
    queryFn: api.liveView,
    refetchInterval: 3_000,
  });
  const refresh = () => {
    void query.invalidateQueries({ queryKey: ["runs"] });
    void query.invalidateQueries({ queryKey: ["run", run.id] });
    void query.invalidateQueries({ queryKey: ["human", run.id] });
    void query.invalidateQueries({ queryKey: ["live"] });
  };
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: refresh,
    onError: (error) => toast.error("Action could not be completed", { description: error.message }),
  });
  const pending = human.data?.find((item) => item.status === "pending");

  return (
    <main className="p-3 sm:p-5">
      <section className="flex items-center justify-between gap-4 px-1 pb-4">
        <div>
          <span className="font-mono text-[10px] tracking-[.14em] text-emerald-300">ACTIVE APPLICATION</span>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">{run.company || hostname(run.job_url)}</h1>
          <p className="mt-1 text-xs capitalize text-slate-400">{run.role || "Role intelligence in progress"} <span className="mx-1.5 text-slate-600">•</span> {run.phase.replaceAll("_", " ")}</p>
        </div>
        <div className="hidden gap-2 sm:flex" aria-label="Pane controls">
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-[11px] text-violet-200 transition hover:bg-slate-800" onClick={() => leftPanel.current?.isCollapsed() ? leftPanel.current.expand() : leftPanel.current?.collapse()}>
            <PanelLeftClose size={15} /> Context
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-[11px] text-violet-200 transition hover:bg-slate-800" onClick={() => rightPanel.current?.isCollapsed() ? rightPanel.current.expand() : rightPanel.current?.collapse()}>
            <PanelRightClose size={15} /> Browser
          </button>
        </div>
      </section>

      <Group
        orientation="horizontal"
        className="min-h-[calc(100vh-13.4rem)] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-black/25"
        defaultLayout={layout.defaultLayout}
        onLayoutChanged={layout.onLayoutChanged}
      >
        <Panel id="context" panelRef={leftPanel} defaultSize={22} minSize={17} collapsible collapsedSize={0}>
          <RunContext run={run} onCancel={() => mutation.mutate(() => api.cancel(run.id))} />
        </Panel>
        <Separator className="group relative w-3 cursor-col-resize bg-slate-950 after:absolute after:inset-x-1 after:top-[40%] after:bottom-[40%] after:rounded after:bg-slate-600 hover:after:bg-violet-300" />
        <Panel id="conversation" defaultSize={46} minSize={33}>
          <AgentConversation run={run} events={events.data ?? []} pendingRequest={pending} />
        </Panel>
        <Separator className="group relative w-3 cursor-col-resize bg-slate-950 after:absolute after:inset-x-1 after:top-[40%] after:bottom-[40%] after:rounded after:bg-slate-600 hover:after:bg-violet-300" />
        <Panel id="workspace" panelRef={rightPanel} defaultSize={32} minSize={24} collapsible collapsedSize={0}>
          <aside className="grid h-full min-w-[280px] grid-rows-[minmax(330px,1fr)_auto] gap-3 bg-slate-950/40 p-3">
            <BrowserPanel
              run={run}
              live={live.data}
              onFocus={() => mutation.mutate(() => api.focus(run.id))}
              onControl={() => mutation.mutate(() => api.takeControl(run.id))}
              onReturn={() => mutation.mutate(() => api.returnControl(run.id))}
            />
            <HumanPanel
              run={run}
              request={pending}
              onAnswer={(answer) => pending && mutation.mutate(() => api.answer(run.id, pending.request_id, answer))}
              onDecision={(decision) => pending && mutation.mutate(() => api.decide(run.id, pending.request_id, decision))}
            />
          </aside>
        </Panel>
      </Group>
    </main>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "New application";
  }
}
