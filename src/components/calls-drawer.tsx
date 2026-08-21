import { LoaderCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { fmtDur, fmtNum, humanAgent, humanModel } from "../lib/format";

function usd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(4)}`;
}

function pct(cache: number, input: number): string {
  if (input <= 0) return "—";
  return `${Math.round((Math.min(cache, input) / input) * 100)}%`;
}

export function CallsDrawer({ runId, onClose }: { runId: string; onClose(): void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["calls", runId],
    queryFn: () => api.calls(runId),
    refetchInterval: 4_000,
  });
  const totals = data?.totals;
  const calls = data?.calls ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="LLM call ledger" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">LLM call ledger</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              One row per successful model call · tokens, cache, TTFT, throughput, cost
            </p>
          </div>
          {totals && (
            <div className="flex shrink-0 items-center gap-1.5 font-mono text-[12.5px] leading-5 tabular-nums text-muted-foreground">
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1">
                {totals.calls} calls
              </span>
              <span
                className="rounded-full border border-border bg-muted/40 px-2.5 py-1"
                title={`${fmtNum(totals.input_tokens)} gross in · ${fmtNum(totals.cache_read_tokens)} cached`}
              >
                {fmtNum(totals.new_input_tokens)}→{fmtNum(totals.output_tokens)}
              </span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
                {usd(totals.cost_usd)}
              </span>
            </div>
          )}
          <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && calls.length === 0 ? (
            <div className="grid h-full place-items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle size={16} className="animate-spin" />
              Loading ledger…
            </div>
          ) : calls.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
              No model calls recorded yet. Calls appear here the moment the first model responds.
            </div>
          ) : (
            <table className="w-full border-collapse text-[12.5px] leading-5 tabular-nums">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                <tr className="text-left text-[10px] tracking-[.08em] text-muted-foreground uppercase">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">agent</th>
                  <th className="px-2 py-2 font-medium">model</th>
                  <th className="px-2 py-2 text-right font-medium">in</th>
                  <th className="px-2 py-2 text-right font-medium">out</th>
                  <th className="px-2 py-2 text-right font-medium">cache</th>
                  <th className="px-2 py-2 text-right font-medium">ttft</th>
                  <th className="px-2 py-2 text-right font-medium">tok/s</th>
                  <th className="px-4 py-2 text-right font-medium">cost</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {calls.map((call) => (
                  <tr key={call.sequence} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-2 text-muted-foreground">{call.sequence}</td>
                    <td className="max-w-32 truncate px-2 py-2 text-foreground" title={call.agent}>
                      {humanAgent(call.agent)}
                    </td>
                    <td className="max-w-44 truncate px-2 py-2 text-muted-foreground" title={call.model}>
                      {humanModel(call.model)}
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{fmtNum(call.input_tokens)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{fmtNum(call.output_tokens)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground" title={`${fmtNum(call.cache_read_tokens)} cached`}>
                      {pct(call.cache_read_tokens, call.input_tokens)}
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{call.ttft_ms ? fmtDur(call.ttft_ms) : "—"}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">
                      {call.tok_per_second ? `${call.tok_per_second.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-primary">{usd(call.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && calls.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/60 font-semibold">
                    <td className="px-4 py-2.5 text-muted-foreground">total</td>
                    <td className="px-2 py-2.5 font-mono text-muted-foreground">{totals.calls} calls</td>
                    <td className="px-2 py-2.5" />
                    <td
                      className="px-2 py-2.5 font-mono text-right text-foreground"
                      title={`${fmtNum(totals.input_tokens)} gross in`}
                    >
                      {fmtNum(totals.new_input_tokens)}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-right text-foreground">{fmtNum(totals.output_tokens)}</td>
                    <td className="px-2 py-2.5 font-mono text-right text-muted-foreground">{pct(totals.cache_read_tokens, totals.input_tokens)}</td>
                    <td className="px-2 py-2.5" colSpan={2} />
                    <td className="px-4 py-2.5 font-mono text-right text-primary">{usd(totals.cost_usd)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </aside>
    </div>
  );
}
