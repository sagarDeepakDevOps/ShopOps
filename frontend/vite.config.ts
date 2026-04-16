import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const backendTarget = process.env.VITE_BACKEND_TARGET || "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/health": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/ready": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/metrics": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/openapi.json": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/docs": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/redoc": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
});
