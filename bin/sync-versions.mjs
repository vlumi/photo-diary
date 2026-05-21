#!/usr/bin/env node
// Propagate the root `package.json`'s `version` to each workspace's
// `package.json`. Tools like pm2 read the version from the package.json in
// the script's own directory (not the monorepo root), so the workspaces
// need their own copy of the version. Root stays the canonical place to
// bump; this script keeps the workspaces in lockstep.
//
// Usage: `npm run version:sync` (or `node bin/sync-versions.mjs` directly).
// `npm install` after will refresh the lockfile to match.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACES = ["server", "converter", "react-app"];

const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const version = rootPkg.version;
if (!version) {
  console.error("Root package.json has no `version` field.");
  process.exit(1);
}

for (const ws of WORKSPACES) {
  const path = join(ROOT, ws, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  if (pkg.version === version) {
    console.log(`✓ ${ws}: already at ${version}`);
    continue;
  }
  pkg.version = version;
  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✓ ${ws}: → ${version}`);
}
