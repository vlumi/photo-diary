import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Database } from "better-sqlite3";

import logger from "../../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const FILENAME_PATTERN = /^(\d+)_.*\.sql$/;

interface Migration {
  version: number;
  filename: string;
  sql: string;
}

interface FkViolation {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
}

const formatFkViolations = (issues: unknown[]): string =>
  issues
    .map((issue) => {
      const v = issue as FkViolation;
      return `  - ${v.table} rowid=${v.rowid} references missing ${v.parent}`;
    })
    .join("\n");

const loadMigrations = (): Migration[] => {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .map((filename) => {
      const match = FILENAME_PATTERN.exec(filename);
      if (!match) return undefined;
      return {
        version: Number(match[1]),
        filename,
        sql: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf-8"),
      };
    })
    .filter((m): m is Migration => m !== undefined)
    .sort((a, b) => a.version - b.version);
};

const currentVersion = (db: Database): number => {
  const metaExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='meta'"
    )
    .get();
  if (!metaExists) {
    return 0;
  }
  const row = db
    .prepare("SELECT value FROM meta WHERE key='schema_version'")
    .get() as { value: string } | undefined;
  return row ? Number(row.value) : 0;
};

/**
 * Apply any pending migrations from `migrations/NNN_*.sql` to the supplied
 * better-sqlite3 connection. Uses `meta.schema_version` as the cursor.
 *
 * Fresh DBs (no `meta` table) start at version 0 and run every migration in
 * order. Existing DBs run only the migrations newer than their current
 * `schema_version`. If the DB's version is newer than any migration on disk
 * (a rollback / version-mismatch scenario), throws.
 *
 * Each migration runs with `PRAGMA foreign_keys = OFF` inside a transaction
 * so schema-changing migrations can rebuild dependent tables without
 * tripping the integrity check mid-flight. `PRAGMA foreign_key_check` after
 * commit verifies the rebuilt state, and `PRAGMA foreign_keys = ON` restores
 * better-sqlite3's default.
 */
export const migrate = (db: Database): void => {
  const migrations = loadMigrations();
  const maxAvailable = migrations[migrations.length - 1]?.version ?? 0;
  const current = currentVersion(db);

  if (current > maxAvailable) {
    throw new Error(
      `DB schema_version is ${current} but the highest available migration ` +
        `is ${maxAvailable}. Refusing to start — the DB has been touched by a ` +
        "newer version of the code."
    );
  }

  const pending = migrations.filter((m) => m.version > current);
  if (pending.length === 0) {
    logger.debug(`DB schema up to date at version ${current}`);
    return;
  }

  logger.info(
    `Applying ${pending.length} DB migration(s): ${current} → ${maxAvailable}`
  );

  // foreign_keys is a connection-level PRAGMA and cannot be changed inside
  // a transaction, so toggle it around the transaction.
  db.pragma("foreign_keys = OFF");
  try {
    for (const m of pending) {
      logger.info(`  Applying ${m.filename}`);
      const apply = db.transaction(() => {
        db.exec(m.sql);
      });
      apply();
      const fkIssues = db.pragma("foreign_key_check") as unknown[];
      if (fkIssues.length > 0) {
        // The post-migration check fires after every migration, so a
        // violation here may pre-date this specific one — particularly
        // common for legacy data drift surfacing only when migrate runs.
        // Either way, refuse to advance until the operator inspects the
        // listed rows and removes the orphans (referenced parent row is
        // gone) or restores them.
        throw new Error(
          `After migration ${m.filename}, foreign-key violations detected:\n` +
            formatFkViolations(fkIssues) +
            "\n\n" +
            "These rows may pre-date this migration. Investigate with " +
            "`./bin/gallery.ts audit --orphan-photos` (gallery_photo rows " +
            "pointing at a missing photo) or `./bin/photo.ts audit --orphans` " +
            "(photos with no gallery link), then remove the orphans and " +
            "re-run."
        );
      }
    }
  } finally {
    db.pragma("foreign_keys = ON");
  }

  logger.info(`DB schema now at version ${currentVersion(db)}`);
};
