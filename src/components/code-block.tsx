import { useEffect, useState } from "react";

export function CodeBlock({ value }: { value: object }) {
  const [html, setHtml] = useState<string>();
  const code = JSON.stringify(value, null, 2);
  useEffect(() => {
    void import("shiki")
      .then(({ codeToHtml }) => codeToHtml(code, { lang: "json", theme: "github-dark" }))
      .then(setHtml);
  }, [code]);
  return html ? <div className="mt-2 max-h-28 overflow-auto rounded bg-slate-950 text-[9px]" dangerouslySetInnerHTML={{ __html: html }} /> : <pre className="mt-2 max-h-28 overflow-auto rounded bg-slate-950 p-2 text-[9px] text-slate-300">{code}</pre>;
}
