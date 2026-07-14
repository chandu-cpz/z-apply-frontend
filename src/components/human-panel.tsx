import { Check, Hand, Send, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { HumanRequest, Run } from "../types";

interface Props { run: Run; request?: HumanRequest; onAnswer: (answer: string) => void; onDecision: (decision: "approve" | "reject") => void; }

export function HumanPanel({ run, request, onAnswer, onDecision }: Props) {
  const [other, setOther] = useState("");
  if (!request) return <section className="human-panel panel idle-human"><Hand size={25}/><h2>Human checkpoint clear</h2><p>The agent will ask for your input only when browser evidence or candidate memory is insufficient.</p><span>Approval stays locked until a fresh review passes.</span></section>;
  const approval = request.kind === "submission_approval";
  return <section className={`human-panel panel ${approval ? "approval" : ""}`}><div className="section-heading"><div><span className="eyebrow">{approval ? "Irreversible action" : "Human input required"}</span><h2>{approval ? "Approve final submission" : "Your answer is needed"}</h2></div><TriangleAlert size={20}/></div><p className="human-question">{request.question}</p>{request.context && <div className="human-context"><ReactMarkdown>{request.context}</ReactMarkdown></div>}
    {approval ? <div className="decision-row"><button className="reject" onClick={() => onDecision("reject")}><X size={16}/> Reject</button><button className="approve" onClick={() => onDecision("approve")}><Check size={16}/> Approve application</button></div> : <><div className="options">{request.options.map((option) => <button onClick={() => onAnswer(option)} key={option}>{option}</button>)}</div>{request.allow_free_text && <form onSubmit={(event) => { event.preventDefault(); if (other.trim()) onAnswer(other); }}><input value={other} onChange={(event) => setOther(event.target.value)} placeholder="Provide a precise answer"/><button className="primary compact"><Send size={15}/> Send</button></form>}</>}
    <footer><span>Risk: <b>{request.risk}</b></span><span>{run.company || "Application"}</span></footer></section>;
}
