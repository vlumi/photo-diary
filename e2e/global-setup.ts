// Runs once before any tests. Builds the SPA into react-app/build/
// (where the server's STATIC_DIR points), then re-seeds the e2e DB
// so each suite starts from a clean fixture state.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

async function globalSetup(): Promise<void> {
  // Build is intentionally not gated by file-mtime tracking. In CI the
  // workspace is fresh; locally the operator can skip a rebuild by
  // setting E2E_SKIP_BUILD=1 when iterating on tests alone.
  if (!process.env.E2E_SKIP_BUILD) {
    const build = spawnSync(
      "npm",
      ["run", "build", "--workspace=react-app"],
      { cwd: REPO_ROOT, stdio: "inherit" }
    );
    if (build.status !== 0) {
      throw new Error("react-app build failed");
    }
  }

  // Seed runs as a subprocess so it inherits tsx's resolver (which
  // resolves the `photo-diary-server` workspace import to its `.ts`
  // sources). Playwright's own globalSetup loader doesn't hook tsx,
  // so a same-process dynamic import would fail on the workspace
  // module specifier.
  const seed = spawnSync("npx", ["tsx", "seed.ts"], {
    cwd: __dirname,
    stdio: "inherit",
  });
  if (seed.status !== 0) {
    throw new Error("e2e seed failed");
  }
}

export default globalSetup;
