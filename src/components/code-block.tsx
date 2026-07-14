import { useEffect, useState } from "react";

export function CodeBlock({ value }: { value: object }) {
  const [html, setHtml] = useState<string>();
  const code = JSON.stringify(value, null, 2);
  useEffect(() => {
    void import("shiki")
      .then(({ codeToHtml }) => codeToHtml(code, { lang: "json", theme: "github-dark" }))
      .then(setHtml);
  }, [code]);
  return html ? <div className="shiki-code" dangerouslySetInnerHTML={{ __html: html }} /> : <pre>{code}</pre>;
}
