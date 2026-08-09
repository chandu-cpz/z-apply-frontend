import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { App } from "./app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } })}>
    <App /><Toaster theme="dark" richColors position="bottom-right" />
  </QueryClientProvider>,
);
