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
    // Default warning trips at 500 kB; the index chunk now sits at ~505
    // kB minified (158 kB gzip) because of unavoidable core deps
    // (react-dom + react-router + i18next + tanstack-query). Bigger,
    // optional deps (framer-motion, Leaflet, chart.js) are already in
    // their own lazy chunks. Bump the threshold so the warning isn't
    // noise on every build.
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/setupTests.ts",
        "src/lib/api-schema.ts",
        "src/main.tsx",
      ],
    },
  },
});
