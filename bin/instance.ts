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
 *   ./code/bin/instance.ts <dir> [--name <name>] [--fix]
 *
 * Where the positional is the instance directory, resolved via
 * `path.resolve()` against cwd: `dev` and `./dev` both mean `<cwd>/dev`,
 * `../sibling` and `/var/photo-diary/blue` resolve as expected.
 * `instance.ts .` is the same as omitting the positional inside an
 * existing instance dir. `--name` overrides the instance's logical name
 * (defaults to the dir basename); honored on bootstrap and on re-runs.
 * The script always treats its own code root as the target version —
 * invoke from the version of the code you want the instance to run.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { confirm, input } from "@inquirer/prompts";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// ---- types ---------------------------------------------------------------

interface RequiredKey {
  key: string;
  description: string;
  default: (ctx: { instanceDir: string; name: string }) => string;
  // False for keys an operator should not be re-prompted for in
  // --edit mode (notably SECRET — rotating it invalidates every
  // session). Defaults true.
  editable?: boolean;
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
    editable: false,
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

// Set / replace a single key in an existing .env. Used by --name on
// doctor / upgrade re-runs to write through to INSTANCE_NAME without
// touching the rest of the file. Preserves comments, blank lines, and
// the line surrounding the replaced key. Appends with a one-line
// comment when the key is absent.
const setEnvKey = (filePath: string, key: string, value: string): void => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let found = false;
  const out = lines.map((line) => {
    const eq = line.indexOf("=");
    if (eq < 0) return line;
    const k = line.slice(0, eq).trim();
    if (k.startsWith("#") || k !== key) return line;
    found = true;
    return `${key}=${value}`;
  });
  if (!found) out.push(`${key}=${value}`);
  fs.writeFileSync(filePath, out.join("\n"));
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

// --- pm2 cycle helpers (upgrade mode, #546) --------------------------------
interface Pm2Process {
  name: string;
  pm2_env: { status: string };
}
const pm2Jlist = (): Pm2Process[] | undefined => {
  const res = spawnSync("pm2", ["jlist"], { encoding: "utf8" });
  if (res.status !== 0) return undefined;
  try {
    return JSON.parse(res.stdout) as Pm2Process[];
  } catch {
    return undefined;
  }
};
const pm2Status = (
  list: Pm2Process[] | undefined,
  name: string
): string | undefined => list?.find((p) => p.name === name)?.pm2_env.status;
const runStep = (
  label: string,
  cmd: string,
  args: string[],
  cwd?: string
): boolean => {
  log(`  $ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd });
  if (res.status !== 0) {
    console.error(`✗ ${label} failed (exit ${res.status ?? "?"})`);
    return false;
  }
  return true;
};
// Best-effort post-cycle probe — server's /api/v1/meta is unauthenticated
// and cheap. PORT is required in .env so we always have it. Non-fatal:
// returns false on any error, caller decides what to do with that.
const probeMeta = async (port: number): Promise<boolean> => {
  const url = `http://127.0.0.1:${port}/api/v1/meta`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

const argv = yargs(hideBin(process.argv))
  .scriptName("instance.ts")
  .locale("en")
  .command(
    "$0 [dir]",
    "Bootstrap, doctor, or upgrade a Photo Diary instance directory",
    (y) =>
      y
        .positional("dir", {
          describe:
            "Instance directory, resolved against cwd via path.resolve(). `dev` and `./dev` both mean `<cwd>/dev`; `../sibling` and absolute paths resolve as expected. May be omitted when run from inside an existing instance dir; in that case the dir is inferred from cwd and the logical name is read from .env's INSTANCE_NAME.",
          type: "string",
        })
        .option("name", {
          describe:
            "Override the instance's logical name (pm2 process label, default `path.basename(dir)`). Honored on bootstrap and on re-runs — writes through to .env's INSTANCE_NAME.",
          type: "string",
        })
        .option("fix", {
          describe:
            "Append missing required keys to an existing .env (doesn't touch existing values)",
          type: "boolean",
          default: false,
        })
        .option("edit", {
          describe:
            "Walk every configurable .env key, show the current value, prompt for a new one (default = keep). For a config-review / tweak pass on an existing instance. Requires a TTY. SECRET is read-only — rotating it invalidates every active session.",
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
        .option("auto", {
          describe:
            "Upgrade only: skip the proceed-with-pm2-cycle prompt and run unattended. Default behaviour prompts on a TTY and prints copy-paste instructions otherwise.",
          type: "boolean",
          default: false,
        })
        .option("print-only", {
          describe:
            "Upgrade only: never run the pm2 cycle; just print the instructions (the pre-cycle-automation behaviour). Wins over --auto if both are set.",
          type: "boolean",
          default: false,
        })
        .option("cycle", {
          describe:
            "Force a pm2 cycle in doctor mode (same code as upgrade-mode cycling: jlist sanity → confirm → delete + start-prod x2 + save → /meta probe). For in-version code updates — typically a `git pull` against the code root the `code` symlink already points at. No-op in upgrade mode (which already cycles).",
          type: "boolean",
          default: false,
          alias: "restart",
        })
  )
  .alias("help", "h")
  .strict()
  .parseSync();

const positional = argv.dir as string | undefined;
const nameFlag = argv.name as string | undefined;
const fix = argv.fix;
const edit = argv.edit as boolean;
const quiet = argv.quiet;
const auto = argv.auto as boolean;
const printOnly = argv["print-only"] as boolean;
const cycle = argv.cycle as boolean;
const isTTY = !!process.stdin.isTTY && !!process.stdout.isTTY;

const log: typeof console.log = (...args) => {
  if (!quiet) console.log(...args);
};

// Resolve `instanceDir` first — it's the structural anchor for everything
// else (path resolution, locating .env, locating the `code` symlink). The
// *logical* instance name (used for pm2 process labels, display) comes
// from `.env`'s INSTANCE_NAME below; only the dir matters for paths.
// path.resolve() handles every form uniformly: bare names (`dev`),
// dot-relative (`./dev`, `../sibling`), and absolute paths all reduce
// to a single absolute target. No parent-dir flag to disentangle from
// the positional — the path itself says where the instance lives.
let instanceDir: string;
let inferredFromCwd = false;
if (positional) {
  instanceDir = path.resolve(positional);
} else if (looksLikeInstanceDir(process.cwd())) {
  instanceDir = process.cwd();
  inferredFromCwd = true;
} else {
  console.error(
    "Error: no <name-or-path> given and cwd is not an instance dir (no `.env` + `code` symlink)."
  );
  console.error("Run with --help for usage.");
  process.exit(1);
}

const envPath = path.join(instanceDir, ".env");
const codeLinkPath = path.join(instanceDir, "code");
const instanceBinDir = path.join(instanceDir, "bin");

// Logical name (the pm2 process label) resolution order:
//
//   1. `--name <value>` if passed. Wins everywhere — bootstrap seeds
//      .env with it, doctor/upgrade re-runs write it through to
//      INSTANCE_NAME below.
//   2. `.env`'s INSTANCE_NAME (the bootstrap default seeds this to
//      `path.basename(instanceDir)`, so for the common case the dir
//      and the name match).
//   3. `path.basename(instanceDir)` — last-resort fallback for runs
//      before .env exists, or rows where the key drifted.
const instanceName = (() => {
  if (nameFlag) return nameFlag;
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
const OPERATOR_SCRIPTS = [
  "photo",
  "photo-rename",
  "photo-geocode",
  "gallery",
  "user",
  "group",
  "meta",
];

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
  // --name on re-runs writes through to .env. The bootstrap path
  // already wrote `instanceName` into the freshly-templated file
  // above; this branch updates an existing row.
  if (nameFlag && existing.INSTANCE_NAME !== nameFlag) {
    setEnvKey(envPath, "INSTANCE_NAME", nameFlag);
    log(`✓ Set INSTANCE_NAME=${nameFlag} in .env`);
  }

  // --edit: walk every editable key, current value as default,
  // write the diff back. Requires a TTY (the rest of the script
  // is non-interactive so headless re-runs can't accidentally
  // snag the prompt). Runs after --fix's append so the operator
  // never edits a missing key by hand on the first pass.
  if (edit) {
    if (!isTTY) {
      console.error(
        "Error: --edit requires a TTY (interactive terminal). Re-run from a shell."
      );
      process.exit(1);
    }
    const refreshed = parseEnv(fs.readFileSync(envPath, "utf8"));
    log();
    log("Editing .env values (Enter keeps the current value):");
    const changes: string[] = [];
    for (const spec of REQUIRED_KEYS) {
      if (spec.editable === false) {
        log(`  · ${spec.key} (read-only, current value preserved)`);
        continue;
      }
      const current = refreshed[spec.key] ?? "";
      const next = await input({
        message: `${spec.key}:`,
        default: current,
      });
      const trimmed = next.trim();
      if (trimmed !== current) {
        setEnvKey(envPath, spec.key, trimmed);
        changes.push(spec.key);
      }
    }
    if (changes.length > 0) {
      log(`✓ Updated .env: ${changes.join(", ")}`);
    } else {
      log("✓ No changes.");
    }
    log();
    log(
      "Restart the instance to pick up the new values (pm2 cycle, or `./bin/instance.ts <dir> --cycle`)."
    );
    process.exit(0);
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
// Sweep stale shortcuts — scripts that used to exist but no longer do
// (e.g., `bin/access.ts` after the ACL refactor moved its surface into
// user/group/gallery.ts). Only removes symlinks, never plain files.
const expectedShortcuts = new Set(OPERATOR_SCRIPTS.map((s) => `${s}.ts`));
const removedShortcuts: string[] = [];
for (const entry of fs.readdirSync(instanceBinDir)) {
  if (!entry.endsWith(".ts") || expectedShortcuts.has(entry)) continue;
  const full = path.join(instanceBinDir, entry);
  try {
    if (fs.lstatSync(full).isSymbolicLink()) {
      fs.unlinkSync(full);
      removedShortcuts.push(entry);
    }
  } catch {
    // ignore — file might have raced
  }
}
if (removedShortcuts.length > 0) {
  log(`✓ Removed stale bin/ shortcuts: ${removedShortcuts.join(", ")}`);
}

// 6. Directories report (doctor)
log();
log("Directories:");
for (const d of REQUIRED_DIRS) {
  const full = path.join(instanceDir, d);
  const present = fs.existsSync(full);
  log(`  ${present ? "✓" : "✗"} ${d}`);
}

// 6b. Tooling — pm2 is a prerequisite for the prod start scripts and
// the upgrade / --cycle pm2-cycle paths. Surface its presence here so
// a missing binary reads as a setup gap, not a transient cycle failure.
log();
log("Tools:");
{
  const res = spawnSync("pm2", ["--version"], { encoding: "utf8" });
  const version = res.status === 0 ? res.stdout.trim() : null;
  if (version) {
    log(`  ✓ pm2 ${version}`);
  } else {
    log("  ✗ pm2 not found on PATH");
    log("    Install with: npm install -g pm2");
    log("    pm2 manages the server + converter processes; start-prod.sh and the upgrade / --cycle flows require it.");
  }
}

// 7. Next steps
log();
if (mode === "new") {
  log("Instance ready.");
  await maybeCreateAdmin();
  log();
  log("Next:");
  log(`  cd ${instanceDir}`);
  log("  ./code/server/bin/start-prod.sh");
  log("  ./code/converter/bin/start-prod.sh");
  log(`  ./bin/gallery.ts create ${instanceName} --title "${instanceName}"`);
} else if (mode === "upgrade") {
  await runPm2Cycle("upgrade");
} else {
  log("Instance state OK.");
  if (cycle) {
    log();
    await runPm2Cycle("restart");
  }
}

// New-mode bootstrap completes without a global-admin user — the
// SPA's manage surface stays locked until one exists. Offer to
// create one right here so the operator doesn't have to walk back
// through the printed-instructions path. Skips on `--auto` and
// non-TTY runs (CI / batch), falling back to the printed steps.
async function maybeCreateAdmin(): Promise<void> {
  if (auto || !isTTY) {
    log();
    log("Create your first admin user when ready:");
    log("  ./bin/user.ts passwd <username>");
    log("  ./bin/user.ts make-admin <username>");
    return;
  }
  log();
  const create = await confirm({
    message: "Create an admin user now?",
    default: true,
  });
  if (!create) {
    log();
    log("Create one later with:");
    log("  ./bin/user.ts passwd <username>");
    log("  ./bin/user.ts make-admin <username>");
    return;
  }
  const username = (
    await input({
      message: "Admin username:",
      default: "admin",
    })
  ).trim();
  if (!username) {
    console.warn("Empty username — skipping admin creation.");
    return;
  }
  // Spawn the routine operator scripts with cwd=instanceDir so they
  // pick up the just-created `.env` (DB path is fixed at <cwd>/db.sqlite3,
  // SECRET / DB_DRIVER live in `.env`). user.ts's `passwd` prompts for
  // the password interactively when omitted — instance.ts never holds
  // the cleartext. inherit stdio so the prompt actually shows.
  const userBin = path.join(instanceDir, "bin", "user.ts");
  const passwdResult = spawnSync(userBin, ["passwd", username], {
    cwd: instanceDir,
    stdio: "inherit",
  });
  if (passwdResult.status !== 0) {
    console.warn(
      `passwd ${username} exited with status ${passwdResult.status ?? "?"} — skipping make-admin.`
    );
    return;
  }
  const adminResult = spawnSync(userBin, ["make-admin", username], {
    cwd: instanceDir,
    stdio: "inherit",
  });
  if (adminResult.status === 0) {
    log(`✓ Admin user "${username}" created.`);
  } else {
    console.warn(
      `make-admin ${username} exited with status ${adminResult.status ?? "?"}.`
    );
  }
}

async function runPm2Cycle(kind: "upgrade" | "restart"): Promise<void> {
  const converterName = `${instanceName}-converter`;
  const verb = kind === "upgrade" ? "Upgrade" : "Restart";
  const summary = kind === "upgrade" ? "pick up the new version" : "pick up the latest code";
  const printInstructions = () => {
    log(`${verb} prepared. Next — cycle pm2 to ${summary}:`);
    log();
    log(`  pm2 delete ${instanceName} ${converterName}`);
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
  };
  const printRollback = () => {
    if (kind !== "upgrade") return;
    log("─".repeat(60));
    log("Rollback — ONLY if the steps above didn't work:");
    log();
    log(`  pm2 delete ${instanceName} ${converterName}`);
    log("  cp db.sqlite3.pre-<version> db.sqlite3");
    log(`  ln -snf <old-code-root> ${codeLinkPath}`);
    log("  ./code/server/bin/start-prod.sh");
    log("  ./code/converter/bin/start-prod.sh");
  };

  // Decide between three paths:
  //   --print-only          → never run the cycle
  //   --auto                → run unattended (CI / cron)
  //   TTY + interactive     → prompt to confirm, run on yes, fall back to
  //                           printed instructions on no
  //   non-TTY without --auto → print instructions (no stdin to prompt from)
  const isTTY = !!process.stdin.isTTY && !!process.stdout.isTTY;
  let runCycle: boolean;
  if (printOnly) {
    runCycle = false;
  } else if (auto) {
    runCycle = true;
  } else if (!isTTY) {
    runCycle = false;
  } else {
    // Sanity-check pm2 state up front so the confirmation prompt has
    // a clear picture: both processes are expected to be online with
    // the previous code (the cycle is happening WHILE they're serving).
    const before = pm2Jlist();
    const serverBefore = pm2Status(before, instanceName);
    const converterBefore = pm2Status(before, converterName);
    log();
    log("pm2 state:");
    log(`  ${serverBefore === "online" ? "✓" : "✗"} ${instanceName}: ${serverBefore ?? "(missing)"}`);
    log(
      `  ${converterBefore === "online" ? "✓" : "✗"} ${converterName}: ${converterBefore ?? "(missing)"}`
    );
    if (serverBefore !== "online" || converterBefore !== "online") {
      log();
      log(
        "  One or both processes aren't online with the previous version —"
      );
      log(
        "  the cycle assumes a running instance. Falling back to printed"
      );
      log("  instructions; review and run manually.");
      log();
      printInstructions();
      log();
      printRollback();
      process.exit(0);
    }
    log();
    try {
      runCycle = await confirm({
        message: `Cycle pm2 (${instanceName} + ${converterName}) to ${summary}?`,
        default: true,
      });
    } catch {
      // Ctrl+C inside the prompt — fall back to manual.
      log();
      log("Cancelled. Printing instructions instead:");
      log();
      printInstructions();
      log();
      printRollback();
      process.exit(0);
    }
  }

  if (!runCycle) {
    printInstructions();
    log();
    printRollback();
    return;
  }
  log();
  log("Cycling pm2 …");
  const ok =
    runStep("pm2 delete", "pm2", ["delete", instanceName, converterName]) &&
    runStep(
      "start server",
      "./code/server/bin/start-prod.sh",
      [],
      instanceDir
    ) &&
    runStep(
      "start converter",
      "./code/converter/bin/start-prod.sh",
      [],
      instanceDir
    ) &&
    runStep("pm2 save", "pm2", ["save"]);
  if (!ok) {
    console.error("✗ Cycle aborted. See output above; rollback instructions:");
    console.error();
    printRollback();
    process.exit(1);
  }
  // Post-cycle sanity: both processes back online, server actually
  // serving on its declared port.
  const after = pm2Jlist();
  const serverAfter = pm2Status(after, instanceName);
  const converterAfter = pm2Status(after, converterName);
  log();
  log("pm2 state after cycle:");
  log(`  ${serverAfter === "online" ? "✓" : "✗"} ${instanceName}: ${serverAfter ?? "(missing)"}`);
  log(
    `  ${converterAfter === "online" ? "✓" : "✗"} ${converterName}: ${converterAfter ?? "(missing)"}`
  );
  const envForProbe = parseEnv(fs.readFileSync(envPath, "utf8"));
  const portStr = envForProbe.PORT;
  const port = portStr ? Number(portStr) : NaN;
  if (Number.isFinite(port)) {
    const served = await probeMeta(port);
    log(
      `  ${served ? "✓" : "✗"} GET http://127.0.0.1:${port}/api/v1/meta ${served ? "responded" : "didn't respond within 5s"}`
    );
    if (!served) {
      console.error();
      console.error(
        "✗ Server is up in pm2 but not answering on its port — review pm2 logs."
      );
      process.exit(1);
    }
  } else {
    log(
      `  ! PORT not parseable from .env (${portStr ?? "missing"}); skipping HTTP probe`
    );
  }
  log();
  log(`✓ ${verb} complete.`);
}
