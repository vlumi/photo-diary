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

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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
      fs.readFileSync(path.join(codeRoot, "package.json"), "utf8")
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

// An instance dir is recognisable by the combination of `.env` + the `code`
// symlink. If both are present and no explicit positional was passed, infer
// the instance dir from cwd — saves operators retyping the name for doctor
// / --fix runs they're already cd'd into.
const looksLikeInstanceDir = (dir: string): boolean => {
  try {
    return (
      fs.statSync(path.join(dir, ".env")).isFile() &&
      fs.lstatSync(path.join(dir, "code")).isSymbolicLink()
    );
  } catch {
    return false;
  }
};

const argv = yargs(hideBin(process.argv))
  .scriptName("instance.ts")
  .command(
    "$0 [name]",
    "Bootstrap, doctor, or upgrade a Photo Diary instance directory",
    (y) =>
      y
        .positional("name", {
          describe:
            "Instance directory name under --base. May be omitted when run from inside an existing instance dir; in that case the dir is inferred from cwd and the logical name is read from .env's INSTANCE_NAME.",
          type: "string",
        })
        .option("base", {
          describe: "Parent directory for the instance dir",
          type: "string",
          default: "/var/photo-diary",
        })
        .option("fix", {
          describe:
            "Append missing required keys to an existing .env (doesn't touch existing values)",
          type: "boolean",
          default: false,
        })
        .option("quiet", {
          describe:
            "Suppress informational output; errors and warnings still surface. For scripted re-runs.",
          type: "boolean",
          default: false,
          alias: "q",
        })
  )
  .alias("help", "h")
  .strict()
  .parseSync();

const positional = argv.name as string | undefined;
const baseFlag = argv.base;
const fix = argv.fix;
const quiet = argv.quiet;

const log: typeof console.log = (...args) => {
  if (!quiet) console.log(...args);
};

// Resolve `instanceDir` first — it's the structural anchor for everything
// else (path resolution, locating .env, locating the `code` symlink). The
// *logical* instance name (used for pm2 process labels, display) comes
// from `.env`'s INSTANCE_NAME below; only the dir matters for paths.
let instanceDir: string;
let inferredFromCwd = false;
if (positional) {
  instanceDir = path.resolve(String(baseFlag), positional);
} else if (looksLikeInstanceDir(process.cwd())) {
  instanceDir = process.cwd();
  inferredFromCwd = true;
} else {
  console.error(
    "Error: no <name> given and cwd is not an instance dir (no `.env` + `code` symlink)."
  );
  console.error("Run with --help for usage.");
  process.exit(1);
}

const envPath = path.join(instanceDir, ".env");
const codeLinkPath = path.join(instanceDir, "code");
const instanceBinDir = path.join(instanceDir, "bin");

// Logical name: prefer `.env`'s INSTANCE_NAME (the pm2 process label),
// fall back to the dir's basename when there's no .env yet or the key
// is missing. The default `bin/instance.ts` template seeds INSTANCE_NAME
// equal to the dir name, so for the common case the two match — but
// operators may legitimately set them apart.
const instanceName = (() => {
  try {
    return (
      parseEnv(fs.readFileSync(envPath, "utf8")).INSTANCE_NAME ??
      path.basename(instanceDir)
    );
  } catch {
    return path.basename(instanceDir);
  }
})();

if (inferredFromCwd) {
  log(`(inferred instance "${instanceName}" at ${instanceDir} from cwd)`);
}

// Routine operator scripts surfaced as `<instance>/bin/<name>.ts` symlinks
// pointing at `<instance>/code/server/bin/<name>.ts`. `instance` itself is
// deliberately not in this list — it's invoked via the absolute path of the
// version you want (`/opt/photo-diary/<version>/bin/instance.ts <name>`) for
// bootstrap and upgrade, and `./code/bin/instance.ts` for the rare doctor
// re-run; a per-instance shortcut would be ambiguous about which code
// version it points at.
const OPERATOR_SCRIPTS = ["photo", "gallery", "user", "access", "meta"];

// ---- run -----------------------------------------------------------------

log(`Instance dir: ${instanceDir}`);
log(`Code root:    ${CODE_ROOT} (v${readVersion(CODE_ROOT)})`);
log();

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
  writeEnvFile(envPath, { instanceDir, name: instanceName });
  log(`✓ Created ${envPath} (with a fresh random SECRET)`);
} else {
  const existing = parseEnv(fs.readFileSync(envPath, "utf8"));
  const missing = REQUIRED_KEYS.filter(({ key }) => !existing[key]);
  if (missing.length === 0) {
    log("✓ .env present and complete");
  } else if (fix) {
    const added = appendMissingKeys(envPath, existing, { instanceDir, name: instanceName });
    log(`✓ Appended missing keys to .env: ${added.join(", ")}`);
  } else {
    console.warn("✗ .env is missing values for:");
    for (const m of missing) console.warn(`    ${m.key} (${m.description})`);
    console.warn("  Re-run with --fix to append defaults, or edit manually.");
  }
}

// 4. Upgrade flow: back up the DB before flipping the symlink
if (mode === "upgrade" && previousCodeTarget) {
  const oldVersion = readVersion(previousCodeTarget);
  const newVersion = readVersion(CODE_ROOT);
  log(
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
    log(`✓ Backed up DB to ${finalBackup}`);
    log(
      "  (Stop the instance before upgrading — the backup may be inconsistent if pm2 is still running.)"
    );
  } else {
    log(`  ${dbPath} doesn't exist yet — skipping backup`);
  }
}

// 5. Symlink
if (previousCodeTarget !== CODE_ROOT) {
  if (fs.existsSync(codeLinkPath) || resolveSymlinkTarget(codeLinkPath) !== null) {
    fs.unlinkSync(codeLinkPath);
  }
  fs.symlinkSync(CODE_ROOT, codeLinkPath);
  log(
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
  log(
    `✓ ${createdShortcuts.length === OPERATOR_SCRIPTS.length ? "Created" : "Refreshed"} ` +
      `bin/ shortcuts: ${createdShortcuts.join(", ")}`
  );
}

// 6. Directories report (doctor)
log();
log("Directories:");
for (const d of REQUIRED_DIRS) {
  const full = path.join(instanceDir, d);
  const present = fs.existsSync(full);
  log(`  ${present ? "✓" : "✗"} ${d}`);
}

// 7. Next steps
log();
if (mode === "new") {
  log("Instance ready. Next:");
  log(`  cd ${instanceDir}`);
  log("  ./code/server/bin/start-prod.sh");
  log("  ./code/converter/bin/start-prod.sh");
  log("  ./bin/user.ts passwd <username> <password>");
  log(`  ./bin/gallery.ts ${instanceName} --title "${instanceName}"`);
  log("  ./bin/access.ts level <username> :all admin");
} else if (mode === "upgrade") {
  log("Upgrade prepared. Next — cycle pm2 to pick up the new version:");
  log();
  log(`  pm2 delete ${instanceName} ${instanceName}-converter`);
  log(`  cd ${instanceDir}`);
  log("  ./code/server/bin/start-prod.sh");
  log("  ./code/converter/bin/start-prod.sh");
  log("  pm2 save");
  log();
  log(
    "  Note: pm2 restart silently keeps the old version (cached script path"
  );
  log(
    "  + package.json are read at start time). Delete + start forces re-resolution."
  );
  log();
  log("─".repeat(60));
  log("Rollback — ONLY if the steps above didn't work:");
  log();
  log(`  pm2 delete ${instanceName} ${instanceName}-converter`);
  log("  cp db.sqlite3.pre-<version> db.sqlite3");
  log(`  ln -snf <old-code-root> ${codeLinkPath}`);
  log("  ./code/server/bin/start-prod.sh");
  log("  ./code/converter/bin/start-prod.sh");
} else {
  log("Instance state OK.");
}
