import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from "react-resizable-panels";
import { Command, History, Moon, PanelLeftClose, PanelRightClose, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "./api";
import { AgentConversation } from "./components/agent-conversation";
import { BrowserPanel } from "./components/browser-panel";
import { RunContext } from "./components/run-context";
import { RunRail } from "./components/run-tabs";
import { StartRun } from "./components/start-run";
import { useEventStream } from "./hooks";
import type { Run } from "./types";
import { useUiStore } from "./ui-store";

export function App() {
  const query = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const theme = useUiStore((state) => state.theme);
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
    <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-stone-100 font-mono text-stone-950 dark:bg-zinc-950 dark:text-zinc-100`}>
      <Header active={selected} />
      {!selected || !selectedId ? (
        <StartRun onSubmit={(url, task) => create.mutate({ url, task })} />
      ) : (
        <Cockpit
          run={selected}
          runs={runs.data ?? []}
          onNew={() => setSelectedId(undefined)}
          onSelect={(nextRun) => {
            setSelectedId(nextRun.id);
            void api.focus(nextRun.id).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

function Header({ active }: { active?: Run }) {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  return (
    <header className="flex h-15 items-center gap-7 border-b border-stone-200 bg-white/95 px-7 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95">
      <a className="flex items-center gap-2.5 text-sm font-bold tracking-[.06em] text-stone-950 dark:text-zinc-100" href="/">
        <span className="grid size-8 place-items-center rounded-lg border border-violet-500/70 bg-violet-600 text-violet-50 shadow-lg shadow-violet-950/50"><Command size={18} /></span>
        <span>Z-APPLY <i className="hidden font-mono text-[9px] font-normal tracking-[.1em] text-stone-400 dark:text-zinc-500 sm:inline">/ local agent workspace</i></span>
      </a>
      <div className="ml-auto hidden font-mono text-[10px] tracking-[.08em] text-stone-500 dark:text-zinc-500 md:block">
        <span className="mr-2 inline-block size-1.5 rounded-full bg-cyan-300 shadow-sm shadow-cyan-300" /> CORE ONLINE
        <b className="ml-2 text-stone-700 dark:text-zinc-300">{active?.current_model || "ROUTER READY"}</b>
      </div>
      <nav className="hidden gap-1 sm:flex">
        <button className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-stone-500 transition hover:text-stone-950 dark:text-zinc-500 dark:hover:text-white"><History size={16} /> History</button>
        <button className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-stone-500 transition hover:text-stone-950 dark:text-zinc-500 dark:hover:text-white"><Settings size={16} /> Diagnostics</button>
        <button className="grid size-8 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white" onClick={toggleTheme} title="Toggle color theme">{theme === "light" ? <Moon size={15} /> : <Sun size={15} />}</button>
      </nav>
    </header>
  );
}

interface CockpitProps {
  run: Run;
  runs: Run[];
  onNew(): void;
  onSelect(run: Run): void;
}

function Cockpit({ run, runs, onNew, onSelect }: CockpitProps) {
  const query = useQueryClient();
  const leftPanel = usePanelRef();
  const rightPanel = usePanelRef();
  const layout = useDefaultLayout({ id: "z-apply-workspace-v2", storage: localStorage });
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
    <main>
      <Group
        orientation="horizontal"
        className="min-h-[calc(100vh-3.75rem)] overflow-hidden bg-stone-100"
        defaultLayout={layout.defaultLayout}
        onLayoutChanged={layout.onLayoutChanged}
      >
        <Panel id="context" panelRef={leftPanel} defaultSize={22} minSize={18} collapsible collapsedSize={0}>
          <div className="flex h-full min-w-[250px] flex-col">
            <RunRail runs={runs} selected={run.id} onNew={onNew} onSelect={onSelect} />
            <RunContext run={run} onCancel={() => mutation.mutate(() => api.cancel(run.id))} />
          </div>
        </Panel>
        <Separator className="group relative w-3 cursor-col-resize bg-stone-200 after:absolute after:inset-x-1 after:top-[40%] after:bottom-[40%] after:rounded after:bg-stone-400 hover:after:bg-violet-500" />
        <Panel id="conversation" defaultSize={47} minSize={33}>
          <AgentConversation
            run={run}
            events={events.data ?? []}
            pendingRequest={pending}
            onAnswer={(answer) => pending && mutation.mutate(() => api.answer(run.id, pending.request_id, answer))}
          />
        </Panel>
        <Separator className="group relative w-3 cursor-col-resize bg-stone-200 after:absolute after:inset-x-1 after:top-[40%] after:bottom-[40%] after:rounded after:bg-stone-400 hover:after:bg-violet-500" />
        <Panel id="workspace" panelRef={rightPanel} defaultSize={31} minSize={24} collapsible collapsedSize={0}>
          <aside className="flex h-full min-w-[280px] flex-col gap-3 bg-stone-100 p-3">
            <BrowserPanel
              run={run}
              live={live.data}
              onFocus={() => mutation.mutate(() => api.focus(run.id))}
              onControl={() => mutation.mutate(() => api.takeControl(run.id))}
              onReturn={() => mutation.mutate(() => api.returnControl(run.id))}
            />
          </aside>
        </Panel>
      </Group>
      <div className="fixed right-4 bottom-4 z-20 hidden gap-2 lg:flex">
        <button className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 py-2 text-[11px] text-stone-600 shadow-lg shadow-stone-300/50 hover:text-stone-950" onClick={() => leftPanel.current?.isCollapsed() ? leftPanel.current.expand() : leftPanel.current?.collapse()}><PanelLeftClose size={15} /> Runs</button>
        <button className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 py-2 text-[11px] text-stone-600 shadow-lg shadow-stone-300/50 hover:text-stone-950" onClick={() => rightPanel.current?.isCollapsed() ? rightPanel.current.expand() : rightPanel.current?.collapse()}><PanelRightClose size={15} /> Browser</button>
      </div>
    </main>
  );
}
