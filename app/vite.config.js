import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The proposal templates live in ../templates and are shared
// with the Edge Function; the app imports them from there.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { allow: [".."] } },
});
