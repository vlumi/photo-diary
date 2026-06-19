import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = path.resolve(__dirname, ".runtime");
const SERVER_ENTRY = path.resolve(__dirname, "../server/index.ts");
const STATIC_DIR = path.resolve(__dirname, "../react-app/build");

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
    reuseExistingServer: !process.env.CI,
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
    },
  },
});
