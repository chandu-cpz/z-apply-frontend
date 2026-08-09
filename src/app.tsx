import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { Archive, Bot, BriefcaseBusiness, Command, Gauge, History, Monitor, Moon, PanelLeftClose, PanelRightClose, Plus, Settings, Sun } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api } from "./api";
import { AgentConversation } from "./components/agent-conversation";
import { AgentsDrawer } from "./components/agents-drawer";
import { BrowserPanel } from "./components/browser-panel";
import { HumanPanel } from "./components/human-panel";
import { RunContext } from "./components/run-context";
import { RunRail } from "./components/run-tabs";
import { StartRun } from "./components/start-run";
import { useEventStream, useLiveEventStream } from "./hooks";
import { type Route, useRoute } from "./routes";
import { ArtifactsScreen } from "./screens/artifacts-screen";
import { DiagnosticsScreen } from "./screens/diagnostics-screen";
import { HistoryScreen } from "./screens/history-screen";
import { SettingsScreen } from "./screens/settings-screen";
import type { HumanRequest, Run } from "./types";
import { useUiStore } from "./ui-store";

export function App() {
  const query = useQueryClient();
  const [route, navigate] = useRoute();
  const theme = useUiStore((state) => state.theme);
  const streamStatus = useEventStream();
  useLiveEventStream();
  const runs = useQuery({ queryKey: ["runs"], queryFn: api.runs, refetchInterval: 5_000 });
  const notifiedRuns = useRef(new Set<string>());
  const routeRunId = route.name === "run" ? route.runId : "";
  const detail = useQuery({ queryKey: ["run", routeRunId], queryFn: () => api.run(routeRunId), enabled: Boolean(routeRunId) });
  const selected = detail.data ?? runs.data?.find((run) => run.id === routeRunId);
  const create = useMutation({
    mutationFn: ({ url, task }: { url: string; task: string }) => api.createRun(url, task),
    onSuccess: (run) => {
      query.setQueryData<Run[]>(["runs"], (old = []) => [run, ...old.filter((item) => item.id !== run.id)]);
      navigate({ name: "run", runId: run.id });
      toast.success("Application queued", { description: "Core now owns the run and will stream verified activity." });
    },
    onError: (error) => toast.error("Unable to start application", { description: error.message }),
  });

  useEffect(() => {
    const waiting = new Set(
      (runs.data ?? []).filter((run) => run.status === "waiting_human").map((run) => run.id),
    );
    for (const runId of notifiedRuns.current) {
      if (!waiting.has(runId)) {
        toast.dismiss(`human-${runId}`);
        notifiedRuns.current.delete(runId);
      }
    }
    for (const run of runs.data ?? []) {
      if (run.status !== "waiting_human" || notifiedRuns.current.has(run.id)) continue;
      notifiedRuns.current.add(run.id);
      toast.warning("Human input required", {
        id: `human-${run.id}`,
        description: `${run.company || run.role || new URL(run.job_url).hostname} is paused safely and needs you.`,
        duration: Infinity,
        action: {
          label: "Open run",
          onClick: () => navigate({ name: "run", runId: run.id }),
        },
      });
    }
  }, [navigate, runs.data]);

  return <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-stone-100 font-sans text-stone-950 antialiased dark:bg-zinc-950 dark:text-zinc-100`}>
    <Header active={selected} route={route} streamStatus={streamStatus} navigate={navigate}/>
    {route.name === "new" && <StartRun onSubmit={(url, task) => create.mutate({ url, task })}/>}
    {route.name === "history" && <HistoryScreen runs={runs.data ?? []} onOpen={(run) => navigate({ name: "run", runId: run.id })}/>}
    {route.name === "artifacts" && <ArtifactsScreen runs={runs.data ?? []}/>}
    {route.name === "settings" && <SettingsScreen/>}
    {route.name === "diagnostics" && <DiagnosticsScreen/>}
    {route.name === "run" && selected && <Cockpit run={selected} runs={runs.data ?? []} onNew={() => navigate({ name: "new" })} onSelect={(run) => navigate({ name: "run", runId: run.id })}/>}
    {route.name === "run" && detail.isLoading && <CenteredMessage>Loading application workspace…</CenteredMessage>}
    {route.name === "run" && detail.isError && <CenteredMessage>Run unavailable: {detail.error.message}</CenteredMessage>}
  </div>;
}

function Header({ active, route, streamStatus, navigate }: { active?: Run; route: Route; streamStatus: string; navigate(route: Route): void }) {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
      <button className="flex shrink-0 items-center gap-2 pr-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100" onClick={() => navigate({ name: "new" })}>
        <span className="grid size-7 place-items-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-950/30"><Command size={15} /></span>
        <span>Z-Apply</span>
      </button>
      <nav className="flex min-w-0 items-center gap-0.5" aria-label="Primary navigation">
        <NavButton active={route.name === "new"} label="New" icon={<Plus size={14} />} onClick={() => navigate({ name: "new" })} />
        <NavButton active={route.name === "history" || route.name === "run"} label="Runs" icon={<History size={14} />} onClick={() => navigate({ name: "history" })} />
        <NavButton active={route.name === "artifacts"} label="Artifacts" icon={<Archive size={14} />} onClick={() => navigate({ name: "artifacts" })} />
        <NavButton active={route.name === "diagnostics"} label="Health" icon={<Gauge size={14} />} onClick={() => navigate({ name: "diagnostics" })} />
        <NavButton active={route.name === "settings"} label="Settings" icon={<Settings size={14} />} onClick={() => navigate({ name: "settings" })} />
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2.5">
        {active && <ActiveRunChip run={active} />}
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400" title="Live event stream">
          <span className={`size-1.5 rounded-full ${streamStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="hidden sm:inline">{streamStatus}</span>
        </span>
        <button className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={toggleTheme} title="Toggle color theme">
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  );
}

/** The active run as one compact chip — no clock, no phase micro-labels. */
function ActiveRunChip({ run }: { run: Run }) {
  const submitted = run.outcome === "submitted_verified";
  const failed = run.status === "terminal" && !submitted && run.outcome !== "cancelled";
  const waiting = run.status === "waiting_human" || run.status === "human_control";
  const running = run.status === "running" || run.status === "starting";
  const dot = submitted
    ? "bg-emerald-400"
    : failed
      ? "bg-rose-400"
      : waiting
        ? "bg-amber-400 animate-pulse"
        : running
          ? "bg-violet-500 animate-pulse"
          : "bg-zinc-400";
  const label = waiting ? "needs you" : submitted ? "submitted" : failed ? "failed" : running ? "running" : "finished";
  return (
    <span className="hidden max-w-64 min-w-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="truncate text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300">{run.company || hostname(run.job_url)}</span>
      <span className="shrink-0 text-[10.5px] text-zinc-400 dark:text-zinc-500">{label}</span>
    </span>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Application";
  }
}

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick(): void }) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition ${active ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"}`}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

interface CockpitProps { run: Run; runs: Run[]; onNew(): void; onSelect(run: Run): void; }

function Cockpit({ run, runs, onNew, onSelect }: CockpitProps) {
  const query = useQueryClient();
  const leftPanel = usePanelRef();
  const rightPanel = usePanelRef();
  const [returningControl, setReturningControl] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"activity" | "browser" | "run">("activity");
  const [subagentsOpen, setSubagentsOpen] = useState(false);
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());
  const desktop = useDesktopWorkspace();
  const layout = useDefaultLayout({ id: "z-apply-workspace-v4", storage: localStorage });
  const events = useQuery({ queryKey: ["events", run.id], queryFn: () => api.events(run.id), refetchInterval: 5_000 });
  const human = useQuery({ queryKey: ["human", run.id], queryFn: () => api.human(run.id), refetchInterval: 3_000, enabled: run.status !== "terminal" });
  const live = useQuery({ queryKey: ["live"], queryFn: api.liveView, refetchInterval: 2_000 });
  const refresh = () => { void query.invalidateQueries({ queryKey: ["runs"] }); void query.invalidateQueries({ queryKey: ["run", run.id] }); void query.invalidateQueries({ queryKey: ["human", run.id] }); void query.invalidateQueries({ queryKey: ["live"] }); };

  const action = useMutation({ mutationFn: async (operation: () => Promise<unknown>) => operation(), onSuccess: refresh, onError: (error) => toast.error("Action could not be completed", { description: error.message }) });
  const respond = useMutation({
    mutationFn: ({ request, answer, decision }: { request: HumanRequest; answer?: string; decision?: "approve" | "reject" }) => request.kind === "submission_approval" ? api.decide(run.id, request.request_id, decision!) : api.answer(run.id, request.request_id, answer!),
    onSuccess: () => { refresh(); toast.success("Response delivered to Core"); },
    onError: (error) => toast.error("Response was not accepted", { description: error.message }),
  });
  const submitResponse = (request: HumanRequest, answer?: string, decision?: "approve" | "reject") => {
    setRespondingIds((prev) => new Set(prev).add(request.request_id));
    respond.mutate({ request, answer, decision }, {
      onSettled: () => setRespondingIds((prev) => {
        const next = new Set(prev);
        next.delete(request.request_id);
        return next;
      }),
    });
  };
  const pendingRequests = (human.data ?? []).filter((item) => item.status === "pending");
  const humanControl = live.data?.control_mode === "human_control" && live.data.focused_run_id === run.id;
  const openRun = (nextRun: Run) => { onSelect(nextRun); if (nextRun.status !== "terminal") action.mutate(() => api.focus(nextRun.id)); };
  const takeControl = () => action.mutate(async () => { await api.focus(run.id); return api.takeControl(run.id); });

  const browser = <BrowserPanel run={run} live={live.data} busy={action.isPending} returning={returningControl} onFocus={() => action.mutate(() => api.focus(run.id))} onControl={takeControl} onReturn={() => { setReturningControl(true); action.mutate(() => api.returnControl(run.id), { onSuccess: () => setReturningControl(false), onError: () => setReturningControl(false) }); }} onClose={() => action.mutate(() => api.closeBrowser(run.id))}/>;
  const sendContext = (content: string) => action.mutate(() => api.sendContext(run.id, content), { onSuccess: () => toast.success("Steering context delivered to the active agent") });
  const context = <RunContext run={run} onCancel={() => action.mutate(() => api.cancel(run.id))} onOpenSubagents={() => setSubagentsOpen(true)}/>;
  const conversation = <AgentConversation run={run} events={events.data ?? []} pendingRequests={pendingRequests} busy={action.isPending} onSendContext={sendContext} onStop={() => action.mutate(() => api.cancel(run.id), { onSuccess: () => toast.success("Run stopped") })}/>;
  const humanPanels = pendingRequests.map((request) => <HumanPanel key={request.request_id} run={run} request={request} busy={respondingIds.has(request.request_id)} human={humanControl} onControl={takeControl} onAnswer={(answer) => submitResponse(request, answer)} onDecision={(decision) => submitResponse(request, undefined, decision)}/>);
  const subagents = subagentsOpen ? <AgentsDrawer runId={run.id} events={events.data ?? []} onClose={() => setSubagentsOpen(false)} /> : null;

  if (!desktop) return <main className="grid h-[calc(100dvh_-_3.75rem)] min-h-0 grid-rows-[minmax(0,1fr)_3.5rem] overflow-hidden bg-stone-100 dark:bg-zinc-950"><div className="min-h-0 overflow-hidden">{mobilePanel === "activity" && conversation}{mobilePanel === "browser" && <aside className="relative flex h-full min-h-0 flex-col overflow-hidden p-2">{browser}{humanPanels.length > 0 && <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col gap-2">{humanPanels}</div>}</aside>}{mobilePanel === "run" && <div className="h-full overflow-hidden">{context}</div>}</div><nav className="grid grid-cols-3 border-t border-stone-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-950" aria-label="Run workspace"><MobileTab active={mobilePanel === "activity"} label="Activity" icon={<Bot size={16}/>} onClick={() => setMobilePanel("activity")}/><MobileTab active={mobilePanel === "browser"} label="Browser" icon={<Monitor size={16}/>} attention={pendingRequests.length > 0} onClick={() => setMobilePanel("browser")}/><MobileTab active={mobilePanel === "run"} label="Run" icon={<BriefcaseBusiness size={16}/>} onClick={() => setMobilePanel("run")}/></nav>{subagents}</main>;

  return <main className="h-[calc(100dvh_-_3.75rem)] min-h-0"><Group orientation="horizontal" className="h-full overflow-hidden" defaultLayout={layout.defaultLayout} onLayoutChanged={layout.onLayoutChanged}>
    <Panel id="context" panelRef={leftPanel} defaultSize={18} minSize={15} collapsible collapsedSize={0}><div className="flex h-full min-w-0 flex-col"><RunRail runs={runs} selected={run.id} onNew={onNew} onSelect={openRun} onCollapse={() => leftPanel.current?.collapse()}/>{context}</div></Panel>
    <ResizeHandle/>
    <Panel id="activity" defaultSize={34} minSize={25}>{conversation}</Panel>
    <ResizeHandle/>
    <Panel id="workspace" panelRef={rightPanel} defaultSize={48} minSize={30} collapsible collapsedSize={0}><aside className="relative flex h-full min-w-0 flex-col overflow-hidden bg-stone-100 p-2 dark:bg-zinc-950">{browser}{humanPanels.length > 0 && <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex max-h-full flex-col gap-2 overflow-y-auto pr-1">{humanPanels}</div>}</aside></Panel>
  </Group>{!humanControl && <div className="fixed right-4 bottom-4 z-20 hidden gap-2 lg:flex"><PanelToggle label="Runs" onClick={() => leftPanel.current?.isCollapsed() ? leftPanel.current.expand() : leftPanel.current?.collapse()} icon={<PanelLeftClose size={15}/>}/><PanelToggle label="Browser" onClick={() => rightPanel.current?.isCollapsed() ? rightPanel.current.expand() : rightPanel.current?.collapse()} icon={<PanelRightClose size={15}/>}/></div>}{subagents}</main>;
}

const desktopMedia = window.matchMedia("(min-width: 768px)");
function useDesktopWorkspace(): boolean { return useSyncExternalStore((notify) => { desktopMedia.addEventListener("change", notify); return () => desktopMedia.removeEventListener("change", notify); }, () => desktopMedia.matches); }
function MobileTab({ active, attention = false, label, icon, onClick }: { active: boolean; attention?: boolean; label: string; icon: React.ReactNode; onClick(): void }) { return <button className={`relative flex items-center justify-center gap-2 rounded-lg text-[11px] ${active ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : "text-stone-500 dark:text-zinc-500"}`} onClick={onClick}>{icon}{label}{attention && <span className="absolute top-1.5 right-[22%] size-2 rounded-full bg-amber-400"/>}</button>; }

function ResizeHandle() { return <Separator className="group relative w-2 cursor-col-resize bg-stone-200 after:absolute after:inset-x-[3px] after:top-[40%] after:bottom-[40%] after:rounded after:bg-stone-400 hover:after:bg-violet-500 dark:bg-zinc-900"/>; }
function PanelToggle({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick(): void }) { return <button className="flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 py-2 text-[11px] text-stone-600 shadow-lg hover:text-stone-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300" onClick={onClick}>{icon}{label}</button>; }
function CenteredMessage({ children }: React.PropsWithChildren) { return <main className="grid min-h-[calc(100dvh_-_3.75rem)] place-items-center p-8 text-sm text-stone-500">{children}</main>; }
