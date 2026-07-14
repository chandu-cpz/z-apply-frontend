import { useEffect, useState } from "react";

export type Route =
  | { name: "new" }
  | { name: "run"; runId: string }
  | { name: "history" }
  | { name: "artifacts" }
  | { name: "settings" }
  | { name: "diagnostics" };

export function parseRoute(pathname: string): Route {
  const match = /^\/runs\/([^/]+)$/.exec(pathname);
  if (match?.[1]) return { name: "run", runId: decodeURIComponent(match[1]) };
  if (pathname === "/history") return { name: "history" };
  if (pathname === "/artifacts") return { name: "artifacts" };
  if (pathname === "/settings") return { name: "settings" };
  if (pathname === "/diagnostics") return { name: "diagnostics" };
  return { name: "new" };
}

export function hrefFor(route: Route): string {
  if (route.name === "run") return `/runs/${encodeURIComponent(route.runId)}`;
  if (route.name === "new") return "/";
  return `/${route.name}`;
}

export function useRoute(): [Route, (route: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const navigate = (next: Route, replace = false) => {
    const href = hrefFor(next);
    window.history[replace ? "replaceState" : "pushState"]({}, "", href);
    setRoute(next);
  };
  return [route, navigate];
}

