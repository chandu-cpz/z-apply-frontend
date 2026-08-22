import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Link } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { ModelCascadingPicker } from "./model-cascading-picker";

const schema = z.object({
  url: z.url("Enter a complete job URL."),
  task: z.string().max(10_000).optional(),
});
type Form = z.infer<typeof schema>;

interface Props {
  onSubmit(url: string, task: string, provider?: string, model?: string): void;
}

const HEADLINE_LINES = [
  "Send a capable",
  "agent into",
  "the application.",
];

/** Loose client-side check purely for the visual top-edge cue; zod still validates on submit. */
const LOOKS_LIKE_URL = /^https?:\/\/\S+\.\S+/i;

export function StartRun({ onSubmit }: Props) {
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", task: "" },
  });
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const urlValue = form.watch("url");
  const urlLooksValid = LOOKS_LIKE_URL.test(urlValue.trim());

  const handleFormSubmit = (data: Form) => {
    onSubmit(
      data.url,
      data.task ?? "",
      selectedProvider || undefined,
      selectedModel || undefined,
    );
  };

  return (
    <main className="relative mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl items-center gap-10 overflow-hidden px-5 py-12 lg:grid-cols-[1.1fr_.9fr]">
      {/* Iris scanline: single 1px sweep, 8s loop, barely-there opacity */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-primary opacity-5"
          initial={{ left: "0%" }}
          animate={{ left: "100%" }}
          transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        />
      )}
      <div>
        <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">Local autonomous apply</p>
        <h1 className="my-5 max-w-xl text-5xl font-semibold leading-[.95] tracking-[-0.02em] text-foreground sm:text-6xl">
          {(reduceMotion
            ? HEADLINE_LINES
            : HEADLINE_LINES.map((line, i) => (
                <motion.span
                  key={line}
                  className="block"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                >
                  {line}
                </motion.span>
              ))
          )}
        </h1>
        <p className="max-w-prose text-[17px] leading-relaxed text-muted-foreground">
          One persistent browser. Evidence-first actions. You remain the approving authority.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BriefcaseBusiness size={14} /> Agent-led execution
          </span>
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground/50" />
          <span className="flex items-center gap-1.5">
            <Link size={14} /> Shared authenticated browser
          </span>
        </div>
      </div>
      <div>
        <form
          className="relative rounded-2xl border border-border bg-card p-6 shadow-xs"
          onSubmit={form.handleSubmit(handleFormSubmit)}
        >
          {/* Top edge lights up once the URL field looks like a real URL */}
          <div
            aria-hidden
            className={`absolute inset-x-0 top-0 h-0.5 origin-left rounded-t-2xl bg-primary transition-[width] duration-500 ease-out ${
              urlLooksValid ? "w-full" : "w-0"
            }`}
          />
          <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">New application</p>
          <label className="mt-5 block text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
            Job URL
            <input
              autoFocus
              className="mt-2 block h-10 w-full rounded-lg border border-input bg-card px-3 text-xs normal-case tracking-normal text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              placeholder="https://company.com/careers/job"
              {...form.register("url")}
            />
          </label>
          <div className="mt-4">
            <label className="mb-2 block text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
              Model & Provider <em className="font-normal normal-case not-italic tracking-normal text-muted-foreground">hover to choose model</em>
            </label>
            <ModelCascadingPicker
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onSelect={(provider, model) => {
                setSelectedProvider(provider);
                setSelectedModel(model);
              }}
              variant="form"
              direction="down"
            />
          </div>
          <label className="mt-4 block text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
            Mission override <em className="font-normal normal-case not-italic tracking-normal text-muted-foreground">optional</em>
            <textarea
              className="mt-2 block w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-xs normal-case tracking-normal text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              placeholder="e.g. Prioritize platform engineering roles and surface non-standard questions."
              rows={3}
              {...form.register("task")}
            />
          </label>
          {form.formState.errors.url && (
            <p className="mt-2 text-xs text-destructive">{form.formState.errors.url.message}</p>
          )}
          <motion.div
            className="mt-5"
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            <Button className="group flex h-10 w-full items-center justify-between px-4" type="submit">
              <span>Launch application</span>
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </motion.div>
          <small className="mt-3 block text-center text-[10px] text-muted-foreground">
            Final submission is always gated by your explicit approval.
          </small>
        </form>
        <button
          type="button"
          onClick={() => navigate({ to: "/history", search: { status: "active" } })}
          className="mx-auto mt-4 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="relative flex size-1.5">
            {!reduceMotion && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            )}
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          Live agents
        </button>
      </div>
    </main>
  );
}
