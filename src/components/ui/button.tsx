import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { tone?: "primary" | "quiet" | "danger" };

/** Local shadcn-style primitive: accessible, composable, and Tailwind-native. */
export function Button({ children, className = "", tone = "primary", ...props }: Props) {
  const tones = {
    primary: "bg-emerald-300 text-emerald-950 hover:bg-emerald-200",
    quiet: "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
    danger: "border border-red-900 bg-red-950 text-red-200 hover:bg-red-900",
  };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50 ${tones[tone]} ${className}`} {...props}>{children}</button>;
}
