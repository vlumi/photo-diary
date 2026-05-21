#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Bootstrap, doctor, or upgrade a Photo Diary instance directory.
 *
 * Modes (auto-detected from the state of the instance dir):
 *
 * - **New**: nothing exists. Create the directory tree, generate `.env` with
 *   a fresh `SECRET`, create the `code` symlink pointing at this script's
 *   own code root.
 * - **Doctor**: instance exists, `code` symlink already points at this
 *   script's root. Verify every required directory, parse `.env`, report any
 *   missing required keys with `✓`/`✗` markers. With `--fix`, append any
 *   missing required keys with default values.
 * - **Upgrade**: instance exists, but `code` points at a different version
 *   than this script's root. Back up the DB file to `db.sqlite3.pre-<new-
 *   version>` (best-effort: assumes the instance is stopped), update the
 *   `code` symlink, then run doctor.
 *
 * Usage:
 *   ./code/bin/instance.ts <name> [--base <dir>] [--fix]
 *
 * Where `<name>` is the instance directory name under `<base>` (default
 * `/var/photo-diary`). The script always treats its own code root as the
 * target version — invoke from the version of the code you want the
 * instance to run.
 */

import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---- types ---------------------------------------------------------------

interface RequiredKey {
  key: string;
  description: string;
  default: (ctx: { instanceDir: string; name: string }) => string;
}

// ---- constants -----------------------------------------------------------

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// bin/ → repo root
const CODE_ROOT = path.resolve(SCRIPT_DIR, "..");

const REQUIRED_DIRS = [
  "photos",
  "photos/inbox",
  "photos/original",
  "photos/display",
  "photos/thumbnail",
];

// Required .env keys for a working instance. The DB file (`db.sqlite3`) and
// photo root (`photos/`) are no longer configurable — they're fixed relative
// to the instance directory (the CWD when the server/converter run via
// start-prod.sh). Symlink the instance dir, the `photos/` subdirectory, or
// the `db.sqlite3` file if you need them on a different disk.
const REQUIRED_KEYS: RequiredKey[] = [
  {
    key: "INSTANCE_NAME",
    description: "pm2 process name; converter gets `<name>-converter`",
    default: ({ name }) => name,
  },
  {
    key: "PORT",
    description: "HTTP port the server listens on (nginx proxies to this)",
    default: () => "4200",
  },
  {
    key: "SECRET",
    description: "HMAC secret for JWT tokens — keep this stable per instance",
    default: () => randomBytes(32).toString("hex"),
  },
  {
    key: "DB_DRIVER",
    description: "DB driver",
    default: () => "sqlite3",
  },
];

// ---- helpers -------------------------------------------------------------

const parseEnv = (content: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (value) out[key] = value;
  }
  return out;
};

const readVersion = (codeRoot: string): string => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(codeRoot, "server", "package.json"), "utf8")
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
};

const resolveSymlinkTarget = (link: string): string | null => {
  try {
    if (!fs.lstatSync(link).isSymbolicLink()) return null;
    return fs.realpathSync(link);
  } catch {
    return null;
  }
};

const writeEnvFile = (filePath: string, ctx: { instanceDir: string; name: string }): void => {
  const lines = REQUIRED_KEYS.map(({ key, description, default: d }) => {
    return `# ${description}\n${key}=${d(ctx)}\n`;
  });
  fs.writeFileSync(filePath, lines.join("\n"));
};

const appendMissingKeys = (
  filePath: string,
  existing: Record<string, string>,
  ctx: { instanceDir: string; name: string }
): string[] => {
  const missing = REQUIRED_KEYS.filter(({ key }) => !existing[key]);
  if (missing.length === 0) return [];
  const additions = missing
    .map(({ key, description, default: d }) => `# ${description}\n${key}=${d(ctx)}\n`)
    .join("\n");
  fs.appendFileSync(filePath, `\n# Added by bin/instance\n${additions}`);
  return missing.map((m) => m.key);
};

// ---- args ----------------------------------------------------------------

const args = process.argv.slice(2);
const name = args[0];
const baseFlagIndex = args.indexOf("--base");
const base = baseFlagIndex >= 0 ? args[baseFlagIndex + 1] : "/var/photo-diary";
const fix = args.includes("--fix");

if (!name || name.startsWith("--")) {
  console.error(
    "Usage: bin/instance.ts <name> [--base <dir>] [--fix]\n" +
      "  <name>     directory name under --base (default /var/photo-diary)\n" +
      "  --fix      append missing required keys to an existing .env (doesn't touch existing values)"
  );
  process.exit(1);
}

const instanceDir = path.resolve(base, name);
const envPath = path.join(instanceDir, ".env");
const codeLinkPath = path.join(instanceDir, "code");
const instanceBinDir = path.join(instanceDir, "bin");

// Routine operator scripts surfaced as `<instance>/bin/<name>.ts` symlinks
// pointing at `<instance>/code/server/bin/<name>.ts`. `instance` itself is
// deliberately not in this list — it's invoked via the absolute path of the
// version you want (`/opt/photo-diary/<version>/bin/instance.ts <name>`) for
// bootstrap and upgrade, and `./code/bin/instance.ts` for the rare doctor
// re-run; a per-instance shortcut would be ambiguous about which code
// version it points at.
const OPERATOR_SCRIPTS = ["photo", "gallery", "user", "access"];

// ---- run -----------------------------------------------------------------

console.log(`Instance dir: ${instanceDir}`);
console.log(`Code root:    ${CODE_ROOT} (v${readVersion(CODE_ROOT)})`);
console.log();

// 1. Directories
for (const d of [".", ...REQUIRED_DIRS]) {
  fs.mkdirSync(path.join(instanceDir, d), { recursive: true });
}

// 2. Detect mode
const envExists = fs.existsSync(envPath);
const previousCodeTarget = resolveSymlinkTarget(codeLinkPath);

let mode: "new" | "doctor" | "upgrade";
if (!envExists) {
  mode = "new";
} else if (previousCodeTarget === null || previousCodeTarget === CODE_ROOT) {
  mode = "doctor";
} else {
  mode = "upgrade";
}

// 3. .env
if (mode === "new") {
  writeEnvFile(envPath, { instanceDir, name });
  console.log(`✓ Created ${envPath} (with a fresh random SECRET)`);
} else {
  const existing = parseEnv(fs.readFileSync(envPath, "utf8"));
  const missing = REQUIRED_KEYS.filter(({ key }) => !existing[key]);
  if (missing.length === 0) {
    console.log("✓ .env present and complete");
  } else if (fix) {
    const added = appendMissingKeys(envPath, existing, { instanceDir, name });
    console.log(`✓ Appended missing keys to .env: ${added.join(", ")}`);
  } else {
    console.log("✗ .env is missing values for:");
    for (const m of missing) console.log(`    ${m.key} (${m.description})`);
    console.log("  Re-run with --fix to append defaults, or edit manually.");
  }
}

// 4. Upgrade flow: back up the DB before flipping the symlink
if (mode === "upgrade" && previousCodeTarget) {
  const oldVersion = readVersion(previousCodeTarget);
  const newVersion = readVersion(CODE_ROOT);
  console.log(
    `Upgrading from v${oldVersion} (${previousCodeTarget}) to v${newVersion} (${CODE_ROOT})`
  );

  // DB file is fixed by convention at `<instance-dir>/db.sqlite3`.
  const dbPath = path.join(instanceDir, "db.sqlite3");
  if (fs.existsSync(dbPath)) {
    const backupPath = `${dbPath}.pre-${newVersion}`;
    let counter = 1;
    let finalBackup = backupPath;
    while (fs.existsSync(finalBackup)) {
      finalBackup = `${backupPath}.${counter++}`;
    }
    fs.copyFileSync(dbPath, finalBackup);
    console.log(`✓ Backed up DB to ${finalBackup}`);
    console.log(
      "  (Stop the instance before upgrading — the backup may be inconsistent if pm2 is still running.)"
    );
  } else {
    console.log(`  ${dbPath} doesn't exist yet — skipping backup`);
  }
}

// 5. Symlink
if (previousCodeTarget !== CODE_ROOT) {
  if (fs.existsSync(codeLinkPath) || resolveSymlinkTarget(codeLinkPath) !== null) {
    fs.unlinkSync(codeLinkPath);
  }
  fs.symlinkSync(CODE_ROOT, codeLinkPath);
  console.log(
    `✓ ${previousCodeTarget ? "Updated" : "Created"} ${codeLinkPath} → ${CODE_ROOT}`
  );
}

// 5b. Operator-script shortcuts in <instance>/bin/. The `.ts` extension is
// kept (rather than bare names) so the symlinks resolve through the
// `<code>/server/tsconfig.json` project when opened in an editor — opening
// a bare-name file would fall back to inferred-project defaults and show
// spurious "Cannot find module" errors on every import.
fs.mkdirSync(instanceBinDir, { recursive: true });
const createdShortcuts: string[] = [];
for (const script of OPERATOR_SCRIPTS) {
  const filename = `${script}.ts`;
  const linkPath = path.join(instanceBinDir, filename);
  const targetRelative = path.join("..", "code", "server", "bin", filename);
  const current = (() => {
    try {
      return fs.readlinkSync(linkPath);
    } catch {
      return null;
    }
  })();
  if (current === targetRelative) continue;
  if (current !== null || fs.existsSync(linkPath)) {
    fs.unlinkSync(linkPath);
  }
  fs.symlinkSync(targetRelative, linkPath);
  createdShortcuts.push(filename);
}
if (createdShortcuts.length > 0) {
  console.log(
    `✓ ${createdShortcuts.length === OPERATOR_SCRIPTS.length ? "Created" : "Refreshed"} ` +
      `bin/ shortcuts: ${createdShortcuts.join(", ")}`
  );
}

// 6. Directories report (doctor)
console.log();
console.log("Directories:");
for (const d of REQUIRED_DIRS) {
  const full = path.join(instanceDir, d);
  const present = fs.existsSync(full);
  console.log(`  ${present ? "✓" : "✗"} ${d}`);
}

// 7. Next steps
console.log();
if (mode === "new") {
  console.log("Instance ready. Next:");
  console.log(`  cd ${instanceDir}`);
  console.log("  ./code/server/bin/start-prod.sh");
  console.log("  ./code/converter/bin/start-prod.sh");
  console.log("  ./bin/user.ts -u <username> -p <password>");
  console.log(`  ./bin/gallery.ts --id ${name} --title "${name}"`);
  console.log("  ./bin/access.ts level <username> :all admin");
} else if (mode === "upgrade") {
  console.log("Upgrade prepared. Restart pm2 to activate:");
  console.log(`  pm2 restart ${name} ${name}-converter`);
  console.log("  # ...or if not yet running:");
  console.log(`  cd ${instanceDir}`);
  console.log("  ./code/server/bin/start-prod.sh");
  console.log("  ./code/converter/bin/start-prod.sh");
  console.log();
  console.log("Rollback (manual, only if needed):");
  console.log(`  pm2 stop ${name} ${name}-converter`);
  console.log("  cp db.sqlite3.pre-<version> db.sqlite3");
  console.log(`  ln -snf <old-code-root> ${codeLinkPath}`);
  console.log(`  pm2 restart ${name} ${name}-converter`);
} else {
  console.log("Instance state OK.");
}
