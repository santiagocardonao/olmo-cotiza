import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Las plantillas de la propuesta viven en ../templates y se comparten
// con la Edge Function; la app las importa desde ahí.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { allow: [".."] } },
});
