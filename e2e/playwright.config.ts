import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = path.resolve(__dirname, ".runtime");
const SERVER_ENTRY = path.resolve(__dirname, "../server/index.ts");
const STATIC_DIR = path.resolve(__dirname, "../react-app/build");

// webServer.cwd is resolved at Playwright startup (before globalSetup
// runs, where the seed normally creates this dir). On a clean
// checkout it doesn't exist and the spawn fails with ENOENT — make
// sure it's there at config-load time.
fs.mkdirSync(RUNTIME_DIR, { recursive: true });

// Coverage capture (opt-in via E2E_COVERAGE=1). Node writes raw v8
// coverage to this dir while the server runs; c8 produces a report
// from there after the suite finishes (see `npm run coverage`).
// Honors an externally-set NODE_V8_COVERAGE so the root-level
// `coverage` script can pool v8 data from vitest + e2e into one dir
// for a unified report.
const COVERAGE_DIR =
  process.env.NODE_V8_COVERAGE ?? path.resolve(__dirname, "coverage", "v8");
if (process.env.E2E_COVERAGE && !process.env.NODE_V8_COVERAGE) {
  fs.rmSync(COVERAGE_DIR, { recursive: true, force: true });
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

const PORT = 4201;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `tsx ${SERVER_ENTRY}`,
    cwd: RUNTIME_DIR,
    port: PORT,
    timeout: 60_000,
    // Coverage capture relies on Node flushing v8 data on graceful
    // exit. Playwright kills with SIGKILL by default; SIGTERM with a
    // grace window lets Node's exit handler run.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // `test` is the only config branch that honours DB_OPTS — prod
      // hardcodes the DB path to `<cwd>/db.sqlite3`, which would
      // ignore our pre-seeded fixture file.
      NODE_ENV: "test",
      DB_DRIVER: "sqlite3",
      DB_OPTS: path.join(RUNTIME_DIR, "db.sqlite3"),
      SECRET: "e2e-secret",
      PORT: String(PORT),
      STATIC_DIR,
      // Match what the seed script used so any future hashing path
      // hits the same cost — bcrypt verification is cost-independent
      // but new hashes (e.g. password rotation tests) need fast costs
      // to keep CI snappy.
      BCRYPT_ROUNDS: "4",
      // v8 coverage capture in the server process. The Node runtime
      // dumps a JSON file per worker to this dir on graceful exit;
      // omitted unless E2E_COVERAGE is set so normal runs stay fast.
      ...(process.env.E2E_COVERAGE
        ? { NODE_V8_COVERAGE: COVERAGE_DIR }
        : {}),
    },
  },
});
