import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, /api se reenvía al backend (por defecto localhost:3000).
// En producción CloudFront hace ese mismo reenvío, por eso el código usa rutas relativas.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": process.env.VITE_API_TARGET || "http://localhost:3000",
    },
  },
});
