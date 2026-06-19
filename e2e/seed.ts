// Standalone seed script for the E2E suite. Sets the server's runtime
// env vars to point at the .runtime/ instance dir, then dynamic-imports
// the server's db module so migrations run + the public DB surface is
// available. Run via `npm run seed` or programmatically from
// global-setup.ts before the webServer starts.
//
// Standalone rather than importing server/tests/api/fixture.ts because
// that helper is locked to vitest's `vi.mock` hoist for config injection
// — outside of vitest, the import fires before any mock can land.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// `fs` is imported only for ensureRuntimeDir() / the CLI-mode entry
// guard; the seed no longer deletes the DB file (see comment in
// seedE2eDb about SQLITE_READONLY_DBMOVED).

import {
  FIXTURE_PASSWORD_HASH,
  USERS,
  GALLERIES,
  ACCESS,
  PHOTOS,
  LINKS,
} from "./fixtures/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_DIR = path.resolve(__dirname, ".runtime");
const DB_PATH = path.join(RUNTIME_DIR, "db.sqlite3");

const ensureRuntimeDir = (): void => {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  for (const sub of ["photos", "photos/inbox", "photos/original", "photos/thumbnail"]) {
    fs.mkdirSync(path.join(RUNTIME_DIR, sub), { recursive: true });
  }
};

export const seedE2eDb = async (): Promise<void> => {
  ensureRuntimeDir();

  // Server config reads these at module load — must be set before the
  // dynamic import resolves. NODE_ENV=test selects the only config
  // branch that honours DB_OPTS; the prod branch hardcodes the DB
  // path to `<cwd>/db.sqlite3`.
  process.env.NODE_ENV = "test";
  process.env.DB_DRIVER = "sqlite3";
  process.env.DB_OPTS = DB_PATH;
  process.env.SECRET = "e2e-secret";
  process.env.PORT = "4201";
  process.env.BCRYPT_ROUNDS = "4";

  // The driver's `_resetForTests` is a non-public seam we reach into
  // for the FK-safe DELETE cascade. Truncating in place keeps the
  // file's inode stable, which matters because Playwright's reused
  // webServer holds an open connection — deleting the file under it
  // would trip SQLITE_READONLY_DBMOVED on the first write.
  const driverFactory = (
    await import("photo-diary-server/db/sqlite3/index.js")
  ).default;
  driverFactory()._resetForTests();

  const { default: db } = await import("photo-diary-server/db/index.js");

  for (const u of USERS) {
    await db.createUser({
      id: u.id,
      name: u.id,
      password: FIXTURE_PASSWORD_HASH,
      secret: `e2e-secret-${u.id}`,
      is_admin: u.isAdmin ? 1 : 0,
    });
  }
  for (const g of GALLERIES) {
    await db.createGallery({
      id: g.id,
      title: g.title,
      description: g.description,
      theme: g.theme ?? "",
    });
  }
  for (const a of ACCESS) {
    await db.upsertUserGallery({
      user_id: a.user,
      gallery_id: a.gallery,
      is_editor: !!a.isEditor,
    });
  }
  for (const p of PHOTOS) {
    await db.createPhoto({
      id: p.id,
      index: p.index,
      title: "",
      description: "",
      taken: {
        instant: {
          timestamp: p.timestamp,
          year: p.year,
          month: p.month,
          day: p.day,
          hour: p.hour,
          minute: p.minute,
          second: p.second,
        },
        author: "E2E Author",
        location: {
          country: p.country,
          place: "",
          coordinates: {
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            altitude: null,
          },
        },
      },
      camera: {
        make: p.cameraMake,
        model: p.cameraModel,
        serial: "",
      },
      lens: { make: "", model: "", serial: "" },
      exposure: {
        focalLength: p.focalLength,
        aperture: p.aperture,
        exposureTime: p.exposureTime,
        iso: p.iso,
      },
    });
  }
  for (const [galleryId, photoIds] of Object.entries(LINKS)) {
    await db.linkGalleryPhoto([galleryId], photoIds);
  }

  console.log(`Seeded E2E DB at ${DB_PATH}`);
};

// CLI entry point — only fires when this file is executed directly
// (`tsx seed.ts` or `npm run seed`), not on import from global-setup.
const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  seedE2eDb().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
