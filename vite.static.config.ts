import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/detroit-connect-preview/",
  plugins: [react()],
  publicDir: "public",
  root: "static",
  build: {
    emptyOutDir: true,
    outDir: "../static-dist",
  },
});
