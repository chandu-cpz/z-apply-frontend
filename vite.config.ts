import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    watch: {
      // Editors/agents write files non-atomically (truncate + write). Without
      // this, chokidar fires on the partial write and Vite caches a broken
      // transform, serving corrupt modules until a manual re-touch/restart.
      // awaitWriteFinish waits for the write to settle before reloading.
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    },
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
    },
  },
});
