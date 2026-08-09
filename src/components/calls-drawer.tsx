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
        className="flex h-full w-full max-w-2xl flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">LLM call ledger</h2>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              One row per successful model call · tokens, cache, TTFT, throughput, cost
            </p>
          </div>
          {totals && (
            <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900">
                {totals.calls} calls
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900">
                {fmtNum(totals.input_tokens)}→{fmtNum(totals.output_tokens)}
              </span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
                {usd(totals.cost_usd)}
              </span>
            </div>
          )}
          <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && calls.length === 0 ? (
            <div className="grid h-full place-items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
              <LoaderCircle size={16} className="animate-spin" />
              Loading ledger…
            </div>
          ) : calls.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
              No model calls recorded yet. Calls appear here the moment the first model responds.
            </div>
          ) : (
            <table className="w-full border-collapse font-mono text-xs tabular-nums">
              <thead className="sticky top-0 bg-zinc-50/95 backdrop-blur dark:bg-zinc-900/95">
                <tr className="text-left text-[10px] tracking-[.08em] text-zinc-400 uppercase dark:text-zinc-500">
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
              <tbody>
                {calls.map((call) => (
                  <tr key={call.sequence} className="border-t border-zinc-100 dark:border-zinc-800/70 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-2 text-zinc-400 dark:text-zinc-500">{call.sequence}</td>
                    <td className="max-w-32 truncate px-2 py-2 text-zinc-700 dark:text-zinc-300" title={call.agent}>
                      {humanAgent(call.agent)}
                    </td>
                    <td className="max-w-44 truncate px-2 py-2 text-zinc-600 dark:text-zinc-400" title={call.model}>
                      {humanModel(call.model)}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">{fmtNum(call.input_tokens)}</td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">{fmtNum(call.output_tokens)}</td>
                    <td className="px-2 py-2 text-right text-zinc-500 dark:text-zinc-500" title={`${fmtNum(call.cache_read_tokens)} cached`}>
                      {pct(call.cache_read_tokens, call.input_tokens)}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-500 dark:text-zinc-500">{call.ttft_ms ? fmtDur(call.ttft_ms) : "—"}</td>
                    <td className="px-2 py-2 text-right text-zinc-500 dark:text-zinc-500">
                      {call.tok_per_second ? `${call.tok_per_second.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-violet-700 dark:text-violet-300">{usd(call.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && calls.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold dark:border-zinc-700 dark:bg-zinc-900">
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">total</td>
                    <td className="px-2 py-2.5 text-zinc-500 dark:text-zinc-400">{totals.calls} calls</td>
                    <td className="px-2 py-2.5" />
                    <td className="px-2 py-2.5 text-right text-zinc-800 dark:text-zinc-200">{fmtNum(totals.input_tokens)}</td>
                    <td className="px-2 py-2.5 text-right text-zinc-800 dark:text-zinc-200">{fmtNum(totals.output_tokens)}</td>
                    <td className="px-2 py-2.5 text-right text-zinc-600 dark:text-zinc-300">{pct(totals.cache_read_tokens, totals.input_tokens)}</td>
                    <td className="px-2 py-2.5" colSpan={2} />
                    <td className="px-4 py-2.5 text-right text-violet-800 dark:text-violet-200">{usd(totals.cost_usd)}</td>
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
