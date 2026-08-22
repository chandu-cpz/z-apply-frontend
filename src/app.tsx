import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { Archive, Bot, BriefcaseBusiness, Command, Gauge, History, Monitor, Moon, PanelLeftClose, PanelRightClose, Plus, Settings, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "./api";
import { hostnameOf, runAttentionLabel } from "./lib/format";
import { getRunStatusMeta } from "./lib/run-status";
import { emptySubmissionEvidence, reduceSubmissionEvidence } from "./lib/submission-evidence";
import { runSchema } from "./schemas";
import { useRun, useRuns, useSyncStore } from "./sync-store";
import { AgentConversation } from "./components/agent-conversation";
import { AgentsDrawer } from "./components/agents-drawer";
import { AttentionBell } from "./components/attention-bell";
import { BrowserPanel } from "./components/browser-panel";
import { CommandPalette } from "./components/command-palette";
import { RunContext } from "./components/run-context";
import { RunRail } from "./components/run-tabs";
import { StartRun } from "./components/start-run";
import { useEventStream, useLiveEventStream } from "./hooks";
import { ArtifactsScreen } from "./screens/artifacts-screen";
import { HistoryScreen } from "./screens/history-screen";
import type { Run } from "./types";

/* ------------------------------------------------------------------ */
/* Shell (root route): theme, header, SSE bootstrap, attention toasts  */
/* ------------------------------------------------------------------ */

export function AppShell() {
  const streamStatus = useEventStream();
  useLiveEventStream();
  // Bootstrap only: the SSE stream owns run state from here on (sync store).
  const runsQuery = useQuery({ queryKey: ["runs"], queryFn: api.runs, staleTime: Infinity });
  const runs = useRuns();
  useEffect(() => {
    if (runsQuery.data) useSyncStore.getState().seedRuns(runsQuery.data);
  }, [runsQuery.data]);

  const navigate = useNavigate();
  const notifiedRuns = useRef(new Set<string>());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const gPressedAt = useRef(0);
  useEffect(() => {
    // Every run waiting on a human gets a persistent sonner toast (bottom-
    // right, rich warning) that survives until the run resolves or is
    // dismissed; clicking "Open run" jumps to that run's chat where the
    // question/approval can be answered inline.
    const waiting = new Set(
      runs
        .filter((run) => run.status === "waiting_human" || run.status === "human_control")
        .map((run) => run.id),
    );
    for (const runId of notifiedRuns.current) {
      if (!waiting.has(runId)) {
        toast.dismiss(`human-${runId}`);
        notifiedRuns.current.delete(runId);
      }
    }
    for (const run of runs) {
      if (run.status !== "waiting_human" && run.status !== "human_control") continue;
      if (notifiedRuns.current.has(run.id)) continue;
      notifiedRuns.current.add(run.id);
      toast.warning(`${runAttentionLabel(run)} needs you`, {
        id: `human-${run.id}`,
        description: "The agent is paused safely and waiting for your input in the chat.",
        duration: Infinity,
        action: {
          label: "Answer in chat",
          onClick: () => navigate({ to: "/runs/$runId", params: { runId: run.id } }),
        },
      });
    }
  }, [navigate, runs]);

  // Global shortcuts: n = new application, g then r (within 800ms) = history,
  // / = focus the run composer, falling back to the palette, ? = palette.
  // Skipped while typing in any field or while the palette itself is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (paletteOpen) return;
      if (event.key === "?") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === "/") {
        event.preventDefault();
        const composer = document.querySelector<HTMLTextAreaElement>('textarea[data-slot="textarea"]');
        if (composer) composer.focus();
        else setPaletteOpen(true);
      } else if (event.key === "n") {
        void navigate({ to: "/new" });
      } else if (event.key === "g") {
        gPressedAt.current = Date.now();
      } else if (event.key === "r" && Date.now() - gPressedAt.current <= 800) {
        gPressedAt.current = 0;
        void navigate({ to: "/history" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, paletteOpen]);

  return <div className="min-h-screen bg-background font-sans text-foreground antialiased">
    <Header streamStatus={streamStatus} />
    <Outlet />
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
  </div>;
}

export function NotFound() {
  const navigate = useNavigate();
  return (
    <main className="grid min-h-[calc(100dvh_-_3.5rem)] place-items-center p-8 text-center">
      <div>
        <p className="text-sm text-muted-foreground">This page does not exist.</p>
        <button className="mt-3 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground shadow-sm hover:border-primary/40 hover:text-primary" onClick={() => navigate({ to: "/new" })}>
          Start a new application
        </button>
      </div>
    </main>
  );
}

const ACTIVE_STATUSES = new Set(["queued", "starting", "running", "waiting_human", "human_control"]);

function startedAtMs(run: Run): number {
  return new Date(run.started_at || run.created_at).getTime();
}

/** The operator's default state is "what is my agent doing right now?"
 * "/" answers it: the newest live run's cockpit. No live run means either
 * nothing has ever run (launch form) or everything is done (queue). */
export function HomeGate() {
  const navigate = useNavigate();
  const runsQuery = useQuery({ queryKey: ["runs"], queryFn: api.runs, staleTime: Infinity });
  useEffect(() => {
    if (!runsQuery.isSuccess) return;
    // Decide from the query payload, NOT the sync store: AppShell seeds the
    // store in a parent effect, and child effects flush first — useRuns()
    // would still be empty on the render where this query resolves.
    const runs = runsQuery.data ?? [];
    if (runs.length === 0) {
      void navigate({ to: "/new", replace: true });
      return;
    }
    const active = runs
      .filter((run) => ACTIVE_STATUSES.has(run.status))
      .sort((a, b) => startedAtMs(b) - startedAtMs(a))[0];
    if (active) void navigate({ to: "/runs/$runId", params: { runId: active.id }, replace: true });
    else void navigate({ to: "/history", replace: true });
  }, [runsQuery.isSuccess, runsQuery.data, navigate]);
  return (
    <main className="grid min-h-[calc(100dvh_-_3.5rem)] place-items-center">
      <p className="text-sm text-muted-foreground">Opening cockpit…</p>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Header({ streamStatus }: { streamStatus: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const params = useParams({ strict: false });
  const active = useRun(params.runId ?? "");
  const waitingCount = useRuns().filter((run) => run.status === "waiting_human" || run.status === "human_control").length;
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-border bg-card/90 px-4 backdrop-blur-xl">
      {/* Attention rides one pixel of chrome: visible in peripheral vision on
          any screen while a run is paused for a human. Static by motion budget. */}
      {waitingCount > 0 && <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-warning" />}
      <button className="flex shrink-0 items-center gap-2 pr-2 text-sm font-semibold text-foreground" onClick={() => navigate({ to: "/" })}>
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Command size={15} /></span>
        <span>Z-Apply</span>
      </button>
      <nav className="flex min-w-0 items-center gap-0.5" aria-label="Primary navigation">
        <button
          className="ml-1 flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[12.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          onClick={() => navigate({ to: "/new" })}
          title="New application (N)"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">New</span>
          <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-[10px] leading-4 text-muted-foreground md:inline">N</kbd>
        </button>
        <NavButton active={pathname.startsWith("/history") || pathname.startsWith("/runs")} label="Runs" icon={<History size={14} />} onClick={() => navigate({ to: "/history" })} />
        <NavButton active={pathname.startsWith("/artifacts")} label="Artifacts" icon={<Archive size={14} />} onClick={() => navigate({ to: "/artifacts" })} />
        <NavButton active={pathname.startsWith("/diagnostics")} label="Health" icon={<Gauge size={14} />} onClick={() => navigate({ to: "/diagnostics" })} />
        <NavButton active={pathname.startsWith("/settings")} label="Settings" icon={<Settings size={14} />} onClick={() => navigate({ to: "/settings" })} />
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2.5">
        {active && <ActiveRunChip run={active} />}
        <AttentionBell />
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground" title="Live event stream">
          <span className={`size-1.5 rounded-full ${streamStatus === "connected" ? "bg-success" : streamStatus === "connecting" || streamStatus === "reconnecting" ? "bg-warning" : "bg-destructive"}`} />
          <span className="hidden sm:inline">{streamStatus}</span>
        </span>
        <button className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} title="Toggle color theme">
          {resolvedTheme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>
    </header>
  );
}

/** The active run as one compact chip — no clock, no phase micro-labels. */
function ActiveRunChip({ run }: { run: Run }) {
  const meta = getRunStatusMeta(run);
  return (
    <span className="hidden max-w-64 min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 lg:flex">
      <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="truncate text-[11.5px] font-medium text-foreground">{run.company || hostnameOf(run.job_url)}</span>
      <span className="shrink-0 text-[10.5px] text-muted-foreground">{meta.label}</span>
    </span>
  );
}

function NavButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick(): void }) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Route screens                                                       */
/* ------------------------------------------------------------------ */

export function NewApplicationScreen() {
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: ({
      url,
      task,
      provider,
      model,
    }: {
      url: string;
      task: string;
      provider?: string;
      model?: string;
    }) => api.createRun(url, task, provider, model),
    onSuccess: (run) => {
      useSyncStore.getState().seedRun(run);
      navigate({ to: "/runs/$runId", params: { runId: run.id } });
      toast.success("Application queued", { description: "Core now owns the run and will stream verified activity." });
    },
    onError: (error) => toast.error("Unable to start application", { description: error.message }),
  });

  return <StartRun onSubmit={(url, task, provider, model) => create.mutate({ url, task, provider, model })} />;
}

export function RunWorkspace() {
  const { runId } = useParams({ from: "/runs/$runId" });
  const navigate = useNavigate();  const detail = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api.run(runId),
    staleTime: Infinity,
  });
  useEffect(() => {
    if (detail.data) useSyncStore.getState().seedRun(detail.data);
  }, [detail.data]);
  const selected = useRun(runId);
  const runs = useRuns();
  if (detail.isLoading) return <CenteredMessage>Loading application workspace…</CenteredMessage>;
  if (detail.isError) return <CenteredMessage>Run unavailable: {detail.error.message}</CenteredMessage>;
  if (!selected) return null;
  return <Cockpit run={selected} runs={runs} onNew={() => navigate({ to: "/new" })} onSelect={(run) => navigate({ to: "/runs/$runId", params: { runId: run.id } })} />;
}

export function HistoryWorkspace() {
  const runs = useRuns();
  const navigate = useNavigate();
  return <HistoryScreen runs={runs} onOpen={(run) => navigate({ to: "/runs/$runId", params: { runId: run.id } })} />;
}

export function ArtifactsWorkspace() {
  const runs = useRuns();
  return <ArtifactsScreen runs={runs} />;
}

/* ------------------------------------------------------------------ */
/* Run cockpit                                                         */
/* ------------------------------------------------------------------ */

interface CockpitProps { run: Run; runs: Run[]; onNew(): void; onSelect(run: Run): void; }

function Cockpit({ run, runs, onNew, onSelect }: CockpitProps) {
  const query = useQueryClient();
  const leftPanel = usePanelRef();
  const rightPanel = usePanelRef();
  const [returningControl, setReturningControl] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"activity" | "browser" | "run">("activity");
  const [subagentsOpen, setSubagentsOpen] = useState(false);
  const desktop = useDesktopWorkspace();
  const layout = useDefaultLayout({ id: "z-apply-workspace-v4", storage: localStorage });
  const events = useQuery({
    queryKey: ["events", run.id],
    queryFn: () => api.events(run.id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  // Mechanical submission evidence: the terminal banner renders verdicts
  // from this struct, never from narration. See lib/submission-evidence.ts.
  const submissionEvidence = useMemo(
    () => (events.data ? reduceSubmissionEvidence(events.data) : emptySubmissionEvidence),
    [events.data],
  );
  // Run state arrives via the sync store; the live view is fetched data
  // (VNC target) refetched when browser topology events invalidate it.
  const refresh = () => { void query.invalidateQueries({ queryKey: ["live"] }); };

  // The live view (VNC) is only needed while the browser panel is actually
  // on screen: pause polling when the tab is hidden or the browser tab is not
  // selected on mobile — no point streaming a screen nobody is looking at.
  const pageVisible = usePageVisible();
  const browserShown = pageVisible && (desktop || mobilePanel === "browser");
  const live = useQuery({
    queryKey: ["live"],
    queryFn: api.liveView,
    enabled: browserShown,
  });

  // Opening a run page (URL, history, or rail) focuses its live browser so
  // the panel always shows the run being viewed. Any run with an open browser
  // (running OR terminal-retained) can be focused. Terminal runs are skipped:
  // a stale "open" tab state on an interrupted run would 404 against core.
  useEffect(() => {
    if (run.status !== "terminal" && run.browser_tab_state === "open" && pageVisible) {
      void api.focus(run.id).catch(() => undefined);
      void query.invalidateQueries({ queryKey: ["live"] });
    }
  }, [run.id, run.status, run.browser_tab_state, pageVisible, query]);

  const action = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: (result) => {
      // Command responses carry the mutated run: seed the store so the UI
      // reflects the action immediately; the stream confirms from there.
      const parsed = runSchema.safeParse(result);
      if (parsed.success) useSyncStore.getState().seedRun(parsed.data);
      refresh();
    },
    onError: (error) => toast.error("Action could not be completed", { description: error.message }),
  });
  const humanControl = live.data?.control_mode === "human_control" && live.data.focused_run_id === run.id;
  const openRun = (nextRun: Run) => { onSelect(nextRun); if (nextRun.status !== "terminal") action.mutate(() => api.focus(nextRun.id)); };
  const takeControl = () => action.mutate(() => api.takeControl(run.id));

  const browser = <BrowserPanel run={run} live={live.data} busy={action.isPending} returning={returningControl} onFocus={() => action.mutate(() => api.focus(run.id))} onControl={takeControl} onReturn={() => { setReturningControl(true); action.mutate(() => api.returnControl(run.id), { onSuccess: () => setReturningControl(false), onError: () => setReturningControl(false) }); }} onClose={() => action.mutate(() => api.closeBrowser(run.id))}/>;
  const sendContext = (content: string) => action.mutate(() => api.sendContext(run.id, content), { onSuccess: () => toast.success("Steering context delivered to the active agent") });
  const context = <RunContext run={run} evidence={submissionEvidence} onCancel={() => action.mutate(() => api.cancel(run.id))} onOpenSubagents={() => setSubagentsOpen(true)}/>;
  const conversation = <AgentConversation run={run} events={events.data ?? []} busy={action.isPending} onSendContext={sendContext} onStop={() => action.mutate(() => api.cancel(run.id), { onSuccess: () => toast.success("Run stopped") })} onAnswer={(requestId, answer) => action.mutate(() => api.answer(run.id, requestId, answer), { onSuccess: () => { refresh(); toast.success("Answer delivered to the agent"); } })} onDecide={(requestId, decision) => action.mutate(() => api.decide(run.id, requestId, decision), { onSuccess: () => { refresh(); toast.success(decision === "approve" ? "Submission approved" : "Submission rejected"); } })}/>;
  const subagents = subagentsOpen ? <AgentsDrawer runId={run.id} events={events.data ?? []} onClose={() => setSubagentsOpen(false)} /> : null;

  if (!desktop) return <main className="grid h-[calc(100dvh_-_3.5rem)] min-h-0 grid-rows-[minmax(0,1fr)_3.5rem] overflow-hidden bg-background"><div className="min-h-0 overflow-hidden">{mobilePanel === "activity" && conversation}{mobilePanel === "browser" && <aside className="relative flex h-full min-h-0 flex-col overflow-hidden p-2">{browser}</aside>}{mobilePanel === "run" && <div className="h-full overflow-hidden">{context}</div>}</div><nav className="grid grid-cols-3 border-t border-border bg-card p-1.5" aria-label="Run workspace"><MobileTab active={mobilePanel === "activity"} label="Activity" icon={<Bot size={16}/>} onClick={() => setMobilePanel("activity")}/><MobileTab active={mobilePanel === "browser"} label="Browser" icon={<Monitor size={16}/>} onClick={() => setMobilePanel("browser")}/><MobileTab active={mobilePanel === "run"} label="Run" icon={<BriefcaseBusiness size={16}/>} onClick={() => setMobilePanel("run")}/></nav>{subagents}</main>;

  return <main className="h-[calc(100dvh_-_3.5rem)] min-h-0"><Group orientation="horizontal" className="h-full overflow-hidden" defaultLayout={layout.defaultLayout} onLayoutChanged={layout.onLayoutChanged}>
    <Panel id="context" panelRef={leftPanel} defaultSize={18} minSize={15} collapsible collapsedSize={0}><div className="flex h-full min-w-0 flex-col"><RunRail runs={runs} selected={run.id} onNew={onNew} onSelect={openRun} onCollapse={() => leftPanel.current?.collapse()}/>{context}</div></Panel>
    <ResizeHandle/>
    <Panel id="activity" defaultSize={34} minSize={25}>{conversation}</Panel>
    <ResizeHandle/>
    <Panel id="workspace" panelRef={rightPanel} defaultSize={48} minSize={30} collapsible collapsedSize={0}><aside className="relative flex h-full min-w-0 flex-col overflow-hidden bg-background p-2">{browser}</aside></Panel>
  </Group>{!humanControl && <div className="fixed right-4 bottom-4 z-20 hidden gap-2 lg:flex"><PanelToggle label="Runs" onClick={() => leftPanel.current?.isCollapsed() ? leftPanel.current.expand() : leftPanel.current?.collapse()} icon={<PanelLeftClose size={15}/>}/><PanelToggle label="Browser" onClick={() => rightPanel.current?.isCollapsed() ? rightPanel.current.expand() : rightPanel.current?.collapse()} icon={<PanelRightClose size={15}/>}/></div>}{subagents}</main>;
}

const desktopMedia = window.matchMedia("(min-width: 768px)");
function useDesktopWorkspace(): boolean { return useSyncExternalStore((notify) => { desktopMedia.addEventListener("change", notify); return () => desktopMedia.removeEventListener("change", notify); }, () => desktopMedia.matches); }

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
function MobileTab({ active, attention = false, label, icon, onClick }: { active: boolean; attention?: boolean; label: string; icon: React.ReactNode; onClick(): void }) { return <button className={`relative flex items-center justify-center gap-2 rounded-lg text-[11px] ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`} onClick={onClick}>{icon}{label}{attention && <span className="absolute top-1.5 right-[22%] size-2 rounded-full bg-warning"/>}</button>; }

function ResizeHandle() { return <Separator className="group relative w-2 cursor-col-resize bg-muted after:absolute after:inset-x-[3px] after:top-[40%] after:bottom-[40%] after:rounded after:bg-muted-foreground/50 hover:after:bg-primary/60"/>; }
function PanelToggle({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick(): void }) { return <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-2 text-[11px] text-muted-foreground shadow-lg hover:text-foreground" onClick={onClick}>{icon}{label}</button>; }
function CenteredMessage({ children }: React.PropsWithChildren) { return <main className="grid min-h-[calc(100dvh_-_3.5rem)] place-items-center p-8 text-sm text-muted-foreground">{children}</main>; }
