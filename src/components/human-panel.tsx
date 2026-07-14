import { Check, Send, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { HumanRequest, Run } from "../types";
import { Button } from "./ui/button";

interface Props { run: Run; request?: HumanRequest; busy?: boolean; onAnswer: (answer: string) => void; onDecision: (decision: "approve" | "reject") => void; }

export function HumanPanel({ run, request, busy = false, onAnswer, onDecision }: Props) {
  if (!request) return null;
  return <HumanPanelContent key={request.request_id} run={run} request={request} busy={busy} onAnswer={onAnswer} onDecision={onDecision}/>;
}

function HumanPanelContent({ run, request, busy = false, onAnswer, onDecision }: Props & { request: HumanRequest }) {
  const [other, setOther] = useState("");
  const approval = request.kind === "submission_approval";
  return <section className={`rounded-xl border bg-slate-900 p-4 shadow-xl ${approval ? "border-amber-300/60 shadow-amber-950/30" : "border-slate-700 shadow-black/20"}`} aria-live="assertive"><div className="flex items-start justify-between"><div><span className="font-mono text-[10px] tracking-[.14em] text-emerald-300">{approval ? "IRREVERSIBLE ACTION" : "HUMAN INPUT REQUIRED"}</span><h2 className="mt-1 text-base font-medium text-slate-100">{approval ? "Approve final submission" : "Your answer is needed"}</h2></div><TriangleAlert className="text-amber-200" size={20}/></div><p className="my-4 text-[13px] font-medium leading-relaxed text-slate-100">{request.question}</p>{request.context && <div className="mb-3 text-[11px] leading-relaxed text-slate-300 [&_p]:my-1"><ReactMarkdown>{request.context}</ReactMarkdown></div>}
    {request.image_artifact_id && <a className="mb-3 block overflow-hidden rounded-lg border border-slate-700 bg-white p-2" href={`/api/v1/artifacts/${request.image_artifact_id}`} target="_blank" rel="noreferrer" title="Open challenge image"><img className="mx-auto max-h-48 max-w-full object-contain" src={`/api/v1/artifacts/${request.image_artifact_id}`} alt="Human verification challenge"/></a>}
    {approval ? <div className="flex gap-2"><Button className="flex-1" disabled={busy} tone="danger" onClick={() => onDecision("reject")}><X size={15}/> Reject</Button><Button className="flex-1" disabled={busy} onClick={() => onDecision("approve")}><Check size={15}/> Approve</Button></div> : <><div className="flex flex-wrap gap-2">{request.options.map((option) => <Button className="bg-slate-800 text-slate-100 hover:bg-slate-700" disabled={busy} tone="quiet" onClick={() => onAnswer(option)} key={option}>{option}</Button>)}</div>{request.allow_free_text && <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (other.trim() && !busy) onAnswer(other.trim()); }}><input className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-slate-500 focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60" value={other} onChange={(event) => setOther(event.target.value)} placeholder="Provide a precise answer" disabled={busy}/><Button type="submit" disabled={!other.trim() || busy}><Send size={14}/> Send</Button></form>}</>}
    <footer className="mt-3 flex justify-between border-t border-slate-800 pt-2 text-[8px] font-mono uppercase text-slate-400"><span>Risk: <b className="text-amber-200">{request.risk}</b></span><span>{run.company || "Application"}</span></footer></section>;
}
