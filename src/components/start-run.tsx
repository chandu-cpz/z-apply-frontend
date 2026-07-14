import { ArrowRight, BriefcaseBusiness, Link, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";

const schema = z.object({ url: z.url("Enter a complete job URL."), task: z.string().max(10_000).optional() });
type Form = z.infer<typeof schema>;

export function StartRun({ onSubmit }: { onSubmit(url: string, task: string): void }) {
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { url: "", task: "" } });
  return <main className="mx-auto grid min-h-[calc(100vh-118px)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_.9fr]">
    <div>
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[.14em] text-emerald-700 dark:text-emerald-300"><Sparkles size={15}/> LOCAL AUTONOMOUS APPLY</div>
      <h1 className="my-5 max-w-xl text-5xl font-semibold leading-[.95] tracking-tighter text-stone-950 dark:text-zinc-100 sm:text-6xl">Send a capable agent into the application.</h1>
      <p className="max-w-lg text-[17px] leading-relaxed text-stone-600 dark:text-zinc-400">One persistent browser. Evidence-first actions. You remain the approving authority.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <span className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"><BriefcaseBusiness size={16} className="text-emerald-600 dark:text-emerald-300"/> Agent-led execution</span>
        <span className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"><Link size={16} className="text-emerald-600 dark:text-emerald-300"/> Shared authenticated browser</span>
      </div>
    </div>
    <form className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xl shadow-stone-300/30 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20" onSubmit={form.handleSubmit(({ url, task }) => onSubmit(url, task ?? ""))}>
      <div className="flex justify-between font-mono text-[11px] tracking-[.1em] text-violet-700 dark:text-violet-200"><span>NEW APPLICATION</span><i className="not-italic text-stone-400 dark:text-zinc-500">01</i></div>
      <label className="mt-5 block text-xs text-stone-700 dark:text-zinc-200">Job URL<input autoFocus className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-950 outline-none placeholder:text-stone-400 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600" placeholder="https://company.com/careers/job" {...form.register("url")}/></label>
      <label className="mt-4 block text-xs text-stone-700 dark:text-zinc-200">Mission override <em className="not-italic text-stone-400 dark:text-zinc-500">optional</em><textarea className="mt-2 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-3 text-stone-950 outline-none placeholder:text-stone-400 focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600" placeholder="e.g. Prioritize platform engineering roles and surface non-standard questions." rows={4} {...form.register("task")}/></label>
      {form.formState.errors.url && <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">{form.formState.errors.url.message}</p>}
      <Button className="mt-5 flex w-full justify-between px-4 py-3" type="submit"><span>Launch application</span><ArrowRight size={18}/></Button>
      <small className="mt-3 block text-center text-[10px] text-stone-500 dark:text-zinc-500">Final submission is always gated by your explicit approval.</small>
    </form>
  </main>;
}
