import { useNavigate } from "@tanstack/react-router";
import { Archive, Gauge, History, Plus, Settings } from "lucide-react";
import { hostnameOf } from "@/lib/format";
import { getRunStatusMeta } from "@/lib/run-status";
import { useRuns } from "../sync-store";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";

/** Command palette: static pages plus the newest applications. Shortcuts live
 * in AppShell; this component only renders the dialog and navigates on select. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const runs = useRuns();
  const navigate = useNavigate();
  const recent = [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const close = () => onOpenChange(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search applications and pages…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => { close(); void navigate({ to: "/" }); }}>
            <Plus />
            <span>New application</span>
          </CommandItem>
          <CommandItem onSelect={() => { close(); void navigate({ to: "/history" }); }}>
            <History />
            <span>Runs</span>
          </CommandItem>
          <CommandItem onSelect={() => { close(); void navigate({ to: "/artifacts" }); }}>
            <Archive />
            <span>Artifacts</span>
          </CommandItem>
          <CommandItem onSelect={() => { close(); void navigate({ to: "/diagnostics" }); }}>
            <Gauge />
            <span>Health</span>
          </CommandItem>
          <CommandItem onSelect={() => { close(); void navigate({ to: "/settings" }); }}>
            <Settings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
        {recent.length > 0 && (
          <CommandGroup heading="Applications">
            {recent.map((run) => {
              const meta = getRunStatusMeta(run);
              const label = run.company || hostnameOf(run.job_url);
              return (
                <CommandItem
                  key={run.id}
                  value={`${label} ${meta.label}`}
                  onSelect={() => { close(); void navigate({ to: "/runs/$runId", params: { runId: run.id } }); }}
                >
                  <span className="truncate">{label}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{meta.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
