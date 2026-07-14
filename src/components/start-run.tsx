import { ArrowRight, BriefcaseBusiness, Link, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function StartRun({ onSubmit }: { onSubmit(url: string, task: string): void }) {
  const schema = z.object({ url: z.url("Enter a complete job URL."), task: z.string().max(10_000).optional() });
  type Form = z.infer<typeof schema>;
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { url: "", task: "" } });
  return <main className="start-screen"><div className="start-copy"><div className="kicker"><Sparkles size={15}/> LOCAL AUTONOMOUS APPLY</div><h1>Send a capable agent<br/>into the application.</h1><p>One persistent browser. Evidence-first actions. You remain the approving authority.</p><div className="promise-grid"><span><BriefcaseBusiness/> Agent-led execution</span><span><Link/> Shared authenticated browser</span></div></div><form className="launch-card" onSubmit={form.handleSubmit(({ url, task }) => onSubmit(url, task ?? ""))}><div className="form-label"><span>NEW APPLICATION</span><i>01</i></div><label>Job URL<input autoFocus placeholder="https://company.com/careers/job" {...form.register("url")} /></label><label>Mission override <em>optional</em><textarea placeholder="e.g. Prioritize platform engineering roles and surface non-standard questions." rows={4} {...form.register("task")}/></label>{form.formState.errors.url && <p className="form-error">{form.formState.errors.url.message}</p>}<button className="primary launch"><span>Launch application</span><ArrowRight size={18}/></button><small>Final submission is always gated by your explicit approval.</small></form></main>;
}
