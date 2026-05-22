import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ANALYZE=1 npm run build → writes build/bundle-stats.html for the
    // bundle audit (#221). No-op otherwise so production builds stay clean.
    process.env.ANALYZE
      ? visualizer({
        filename: "build/bundle-stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        open: false,
      })
      : null,
  ].filter(Boolean),
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/api": "http://localhost:4200",
    },
  },
  build: {
    outDir: "build",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    css: false,
  },
});
