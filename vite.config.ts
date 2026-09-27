import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development the SPA talks to a local api (hammurapi-core) through this proxy,
// so cookies stay same-origin exactly as behind the production ingress.
const api = process.env.HAMMURAPI_API ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: api, changeOrigin: false },
      "/admin/api": { target: api, changeOrigin: false },
    },
  },
  build: { sourcemap: true, chunkSizeWarningLimit: 1500 },
  test: { environment: "node" },
});
