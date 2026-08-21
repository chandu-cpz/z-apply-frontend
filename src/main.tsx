import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } })}>
    {/* Dark is pinned as the cockpit default; light is an explicit opt-in.
        The pre-paint script in index.html applies the class before React runs. */}
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  </QueryClientProvider>,
);
