import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/health": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/api/health": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check-grammar": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check-resume": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check-email": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check-healthcare": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check-academic": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check-business": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/check": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/detect-tone": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/rewrite": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/api/rewrite": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/api/analyze": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/analyze": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/api/metrics": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/metrics": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/improve-email": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/improve-resume-bullet": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/improve-healthcare": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/agent": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/documents": { target: "http://127.0.0.1:8002", changeOrigin: true },
      "/history": { target: "http://127.0.0.1:8002", changeOrigin: true },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
});
