#!/usr/bin/env -S npx tsx
/* eslint-disable no-console -- interactive CLI tool; console output is the UI */

/**
 * Reverse-geocode the photos already in the DB. Walks every photo with
 * coordinates that doesn't yet have geocoded data for each requested
 * language and fills it in via the Nominatim queue.
 *
 *   photo-geocode.ts                 # dry-run report (use REVERSE_GEOCODE_EXTRA_LANGS from .env)
 *   photo-geocode.ts --apply         # actually fetch + write
 *   photo-geocode.ts --langs en,ja   # explicit list (en is always included)
 *   photo-geocode.ts --limit 100     # cap per language (default: no cap)
 *   photo-geocode.ts --force         # run even when REVERSE_GEOCODE isn't set
 *   photo-geocode.ts --yes           # skip the confirmation prompt
 *
 * Runs from the per-instance directory (`/var/photo-diary/<name>/`), so the
 * SQLite DB at `./db.sqlite3` and the geocode cache at `./.geocode/` (override
 * via GEOCODE_DIR) line up with what the converter's intake path uses.
 *
 * Order is recent-first by capture timestamp — recent / visible photos get
 * filled in earliest. At 1 RPS per language this is genuinely long-running;
 * the lock at `${GEOCODE_DIR}/lock` (PID inside, O_EXCL on creation, stale-
 * detection via `process.kill(pid, 0)`) keeps two instances from racing.
 *
 * Concurrent server writes against the same SQLite DB are short and unlikely
 * to collide in practice, but the safest run is with the server stopped.
 */

import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { geocode } from "photo-diary-converter/reverse-geocode/index.js";

import db from "../db/index.js";
import logger from "../lib/logger.js";

// ---- lock ----------------------------------------------------------------

const geocodeDir = (): string =>
  process.env.GEOCODE_DIR ?? path.join(process.cwd(), ".geocode");
const lockPath = (): string => path.join(geocodeDir(), "lock");

let lockFd: number | null = null;
let lockReleased = false;

const acquireLock = (): void => {
  fs.mkdirSync(geocodeDir(), { recursive: true });
  const p = lockPath();
  // Retry once after clearing a stale lock; a third attempt means
  // someone else is racing for the same lock and the operator should
  // sort it out.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      lockFd = fs.openSync(
        p,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
        0o644
      );
      fs.writeSync(lockFd, `${process.pid}\n`);
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
    // Lock exists. Inspect the holder.
    let pid: number | null;
    try {
      const raw = fs.readFileSync(p, "utf8").trim();
      const n = Number(raw);
      pid = Number.isInteger(n) && n > 0 ? n : null;
    } catch {
      // file was unlinked between our open() and read(); loop and retry
      continue;
    }
    if (pid === null) {
      logger.info(`Removing malformed lock at ${p}`);
      try { fs.unlinkSync(p); } catch { /* raced; loop retries */ }
      continue;
    }
    let alive = false;
    try {
      process.kill(pid, 0);
      alive = true;
    } catch {
      // ESRCH (or EPERM with no such pid) — treat as stale
    }
    if (alive) {
      throw new Error(
        `photo-geocode is already running (pid ${pid}). Lock: ${p}`
      );
    }
    logger.info(`Removing stale lock for dead pid ${pid}: ${p}`);
    try { fs.unlinkSync(p); } catch { /* raced; loop retries */ }
  }
  throw new Error(`Could not acquire lock at ${lockPath()} after retries`);
};

const releaseLock = (): void => {
  if (lockReleased) return;
  lockReleased = true;
  if (lockFd !== null) {
    try { fs.closeSync(lockFd); } catch { /* */ }
    lockFd = null;
  }
  try { fs.unlinkSync(lockPath()); } catch { /* */ }
};

const installCleanup = (): void => {
  process.on("exit", releaseLock);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => {
      releaseLock();
      // Re-raise so the shell sees the canonical 128+N exit.
      process.exit(sig === "SIGINT" ? 130 : sig === "SIGTERM" ? 143 : 129);
    });
  }
};

// ---- args ----------------------------------------------------------------

const parseLangs = (raw: string | undefined): string[] => {
  const extras = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "en");
  // Dedupe while preserving order; English is always first.
  const seen = new Set<string>(["en"]);
  const out = ["en"];
  for (const l of extras) {
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out;
};

const confirm = async (prompt: string): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${prompt} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};

const argv = await yargs(hideBin(process.argv))
  .scriptName("photo-geocode.ts")
  .locale("en")
  .strict()
  .usage("Usage: $0 [--apply] [--langs en,ja] [--limit N] [--force] [--yes]")
  .option("apply", {
    type: "boolean",
    default: false,
    describe:
      "Actually fetch from Nominatim and write rows. Without this, the script reports counts and exits (dry-run is the default).",
  })
  .option("langs", {
    type: "string",
    describe:
      "Comma-separated languages to backfill (en is always included). " +
      "Defaults to en + REVERSE_GEOCODE_EXTRA_LANGS from .env.",
  })
  .option("limit", {
    type: "number",
    default: 0,
    describe: "Cap photos processed per language (0 = no cap).",
  })
  .option("force", {
    type: "boolean",
    default: false,
    describe:
      "Run even when REVERSE_GEOCODE isn't set in .env. Useful for one-off backfills on an instance that keeps intake-time geocoding off.",
  })
  .option("yes", {
    type: "boolean",
    default: false,
    describe: "Skip the confirmation prompt (only meaningful with --apply).",
  })
  .parseAsync();

if (!process.env.REVERSE_GEOCODE && !argv.force) {
  console.error(
    "REVERSE_GEOCODE is not set in .env. Either set it to enable intake-time " +
      "geocoding too, or pass --force to run a one-off backfill."
  );
  process.exit(1);
}

const langs = parseLangs(argv.langs ?? process.env.REVERSE_GEOCODE_EXTRA_LANGS);
const perLangLimit = argv.limit > 0 ? argv.limit : Number.MAX_SAFE_INTEGER;
const apply = argv.apply;

// ---- plan ----------------------------------------------------------------

interface TodoEntry {
  id: string;
  lat: number;
  lon: number;
}

const plan = new Map<string, TodoEntry[]>();
let totalCalls = 0;
for (const lang of langs) {
  const rows = (await db.loadPhotosMissingGeocoded(
    lang,
    perLangLimit
  )) as TodoEntry[];
  plan.set(lang, rows);
  totalCalls += rows.length;
}

console.log(`Languages: ${langs.join(", ")}`);
for (const lang of langs) {
  console.log(`  ${lang}: ${plan.get(lang)!.length} photo(s) missing geocoded data`);
}
console.log(`Total: ${totalCalls} Nominatim call(s)`);
if (totalCalls > 0) {
  // 1 RPS per language, sequential per process; the worst case is one
  // language doing every call back-to-back.
  const seconds = Math.max(...langs.map((l) => plan.get(l)!.length));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  console.log(`Estimated minimum wall time: ~${mins}m${rem}s (1 RPS per language)`);
}

if (totalCalls === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}
if (!apply) {
  console.log("\nDry run. Re-run with --apply to fetch and write.");
  process.exit(0);
}
if (!argv.yes) {
  console.log("");
  const ok = await confirm("Proceed?");
  if (!ok) {
    console.log("Aborted.");
    process.exit(0);
  }
}

// ---- run -----------------------------------------------------------------

try {
  acquireLock();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
installCleanup();

const t0 = Date.now();
let calls = 0;
let written = 0;
let empty = 0;

// Photos that returned no Nominatim data on this run. Address coverage
// is language-independent — once one lang fails, the rest will too,
// so we skip them on subsequent lang passes within this run AND flag
// the row so future runs skip too.
const noDataPhotos = new Set<string>();

try {
  for (const lang of langs) {
    const todo = plan.get(lang)!;
    logger.info(`[${lang}] starting ${todo.length} photo(s)`);
    let langWritten = 0;
    let langEmpty = 0;
    for (const { id, lat, lon } of todo) {
      if (noDataPhotos.has(id)) continue;
      const result = await geocode(lat, lon, lang);
      calls += 1;
      if (!result) {
        empty += 1;
        langEmpty += 1;
        noDataPhotos.add(id);
        await db.markGeocodeNoData(id);
        logger.info(`[${lang}] ${id} (${lat},${lon}): no result, flagged`);
        continue;
      }
      await db.upsertGeocoded(id, lang, {
        countryCode: lang === "en" ? (result.countryCode ?? null) : undefined,
        state: result.state ?? null,
        city: result.city ?? null,
        district: result.district ?? null,
        place: result.place,
        address: JSON.stringify(result.address),
      });
      written += 1;
      langWritten += 1;
      logger.info(`[${lang}] ${id}: ${result.place}`);
    }
    logger.info(
      `[${lang}] done: ${langWritten} written, ${langEmpty} empty`
    );
  }
} finally {
  releaseLock();
}

const elapsed = Math.round((Date.now() - t0) / 1000);
logger.info(
  `Total: ${calls} call(s), ${written} written, ${empty} empty, elapsed ${elapsed}s`
);
