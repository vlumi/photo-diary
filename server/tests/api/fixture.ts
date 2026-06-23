// Shared fixture for the API + model integration tests. Each test
// file must `vi.mock("../../lib/config/index.js", () => ({ default:
// TEST_CONFIG }))` at its own top level — `vi.mock` is hoisted per
// file and can't live in this helper.
//
// Inserts the standard API-test users / galleries / photos / ACL /
// links into a real `:memory:` SQLite via the sqlite3 driver so the
// controllers exercise actual SQL. Mirrors `db/sqlite3/helper.ts`
// for the driver-level parity tests, extended with the broader
// fixture data the API surface needs.
//
// `db` and `config` are dynamic-imported inside `seedApiFixture` so
// the test file's `vi.mock` lands before the driver module reads
// `config.DB_DRIVER` / `DB_OPTS`. A static `import db` here would
// load the driver against the real config before the mock applied.

export const TEST_CONFIG = {
  ENV: "test",
  PORT: "0",
  SECRET: "test-secret",
  DEBUG: false,
  DB_DRIVER: "sqlite3",
  DB_OPTS: ":memory:",
};

// bcrypt hash of "foobar" at cost 10 — same constant the dummy
// fixture uses. cost 10 verifies fine under the test env's
// `BCRYPT_ROUNDS=4` (bcrypt reads the cost from the hash prefix
// for verification; the env var only affects new hashes).
export const FIXTURE_PASSWORD = "foobar";
const PASSWORD_HASH =
  "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG";

interface UserSeed {
  id: string;
  isAdmin?: boolean;
}
const USERS: UserSeed[] = [
  { id: "admin", isAdmin: true },
  { id: "gallery1admin" },
  { id: "gallery2admin" },
  { id: "gallery1user" },
  { id: "gallery12user" },
  { id: "plainuser" },
  { id: "publicuser" },
  { id: "simpleuser" },
  { id: "blockeduser" },
];

interface GallerySeed {
  id: string;
  title: string;
  description: string;
  theme?: string;
}
const GALLERIES: GallerySeed[] = [
  {
    id: "gallery1",
    title: "gallery 1",
    description: "This is the first gallery",
  },
  {
    id: "gallery2",
    title: "gallery 2",
    description: "This is the second gallery",
    theme: "blue",
  },
  {
    id: "gallery3",
    title: "gallery 3",
    description: "This is the third gallery",
    theme: "grayscale",
  },
];

interface AccessSeed {
  user: string;
  gallery: string;
  isEditor?: boolean;
}
const ACCESS: AccessSeed[] = [
  { user: "gallery1admin", gallery: "gallery1", isEditor: true },
  { user: "gallery2admin", gallery: "gallery2", isEditor: true },
  { user: "gallery1user", gallery: "gallery1" },
  { user: "gallery12user", gallery: "gallery1" },
  { user: "gallery12user", gallery: "gallery2" },
  // The historical `:all` / `:public` wildcard for plainuser /
  // publicuser is now explicit per-gallery grants on every real
  // gallery in the fixture.
  { user: "plainuser", gallery: "gallery1" },
  { user: "plainuser", gallery: "gallery2" },
  { user: "plainuser", gallery: "gallery3" },
  { user: "publicuser", gallery: "gallery1" },
  { user: "publicuser", gallery: "gallery2" },
  { user: "publicuser", gallery: "gallery3" },
  { user: ":guest", gallery: "gallery3" },
];

interface PhotoSeed {
  id: string;
  index: number;
  timestamp: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  country: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  cameraMake: string;
  cameraModel: string;
  cameraSerial?: string;
  lensMake?: string;
  lensModel?: string;
  lensSerial?: string;
  focalLength: number;
  focalLength35mmEquiv?: number;
  aperture: number;
  exposureTime: number;
  iso: number;
}
const PHOTOS: PhotoSeed[] = [
  {
    id: "gallery1photo.jpg",
    index: 0,
    timestamp: "2018-05-04 13:13:03",
    year: 2018,
    month: 5,
    day: 4,
    hour: 13,
    minute: 13,
    second: 3,
    country: "jp",
    latitude: 35.6595,
    longitude: 139.7005,
    altitude: 36.5,
    cameraMake: "FUJIFILM",
    cameraModel: "X-T2",
    cameraSerial: "123",
    lensMake: "FUJIFILM",
    lensModel: "XF27mmF2.8",
    lensSerial: "456",
    focalLength: 27,
    focalLength35mmEquiv: 41,
    aperture: 5.6,
    exposureTime: 0.0008,
    iso: 200,
  },
  {
    id: "gallery12photo.jpg",
    index: 1,
    timestamp: "2020-07-04 14:13:03",
    year: 2020,
    month: 7,
    day: 4,
    hour: 14,
    minute: 13,
    second: 3,
    country: "nl",
    cameraMake: "Panasonic",
    cameraModel: "DMC-GX7",
    lensModel: "LUMIX G 20/F1.7 II",
    lensSerial: "04JG3165007",
    focalLength: 20,
    focalLength35mmEquiv: 40,
    aperture: 1.7,
    exposureTime: 0.0006666666666666666,
    iso: 200,
  },
  {
    id: "gallery2photo.jpg",
    index: 2,
    timestamp: "2020-07-05 14:13:03",
    year: 2020,
    month: 7,
    day: 5,
    hour: 14,
    minute: 13,
    second: 3,
    country: "jp",
    cameraMake: "FUJIFILM",
    cameraModel: "X-T2",
    cameraSerial: "111",
    lensMake: "FUJIFILM",
    lensModel: "XF27mmF2.8",
    lensSerial: "222",
    focalLength: 27,
    focalLength35mmEquiv: 41,
    aperture: 5.6,
    exposureTime: 0.0008,
    iso: 200,
  },
  {
    id: "gallery3photo.jpg",
    index: 3,
    timestamp: "2020-07-05 14:13:04",
    year: 2020,
    month: 7,
    day: 6,
    hour: 14,
    minute: 13,
    second: 4,
    country: "jp",
    cameraMake: "FUJIFILM",
    cameraModel: "X-T2",
    cameraSerial: "111",
    lensMake: "FUJIFILM",
    lensModel: "XF27mmF2.8",
    lensSerial: "222",
    focalLength: 27,
    focalLength35mmEquiv: 41,
    aperture: 5.6,
    exposureTime: 0.0008,
    iso: 200,
  },
  {
    id: "orphanphoto.jpg",
    index: 4,
    timestamp: "2020-08-05 14:13:03",
    year: 2020,
    month: 8,
    day: 5,
    hour: 14,
    minute: 13,
    second: 3,
    country: "fi",
    cameraMake: "FUJIFILM",
    cameraModel: "X100F",
    cameraSerial: "123456",
    focalLength: 23,
    aperture: 5.6,
    exposureTime: 0.0005263157894736842,
    iso: 200,
  },
];

const LINKS: Record<string, string[]> = {
  gallery1: ["gallery1photo.jpg", "gallery12photo.jpg"],
  gallery2: ["gallery12photo.jpg", "gallery2photo.jpg"],
  gallery3: ["gallery3photo.jpg"],
};

const META = {
  instance_name: "dummy instance",
  instance_description: "dummy instance for automated tests",
  instance_cdn: "http://localhost",
  instance_image: "dummy.jpg",
};

// Wipe + reseed the shared API-test fixture into the `:memory:`
// sqlite3 connection that backs the test driver. Idempotent so
// `beforeEach` can call it without ordering surprises between
// tests in the same file (which all share one connection).
export const seedApiFixture = async (): Promise<void> => {
  const config = (await import("../../lib/config/index.js")).default;
  if (config.DB_DRIVER !== "sqlite3" || config.DB_OPTS !== ":memory:") {
    throw new Error(
      "seedApiFixture requires DB_DRIVER=sqlite3 + DB_OPTS=:memory:" +
        " — make sure vi.mock applied TEST_CONFIG."
    );
  }
  const db = (await import("../../db/index.js")).default;
  // `_resetForTests` is exposed on the sqlite3 driver factory only,
  // not re-exported through the `db/index.ts` dispatcher (test-only
  // seam stays out of the production surface). Reach for it via the
  // driver factory directly — both factory calls share the same
  // module-level `Database(":memory:")` connection, so this reset
  // wipes the same DB the dispatcher writes to.
  const driverFactory = (await import("../../db/sqlite3/index.js"))
    .default;
  driverFactory()._resetForTests();
  // The stats cache lives in the worker process; flush so a
  // previous test's gallery1 cache doesn't survive into the next
  // seed.
  const { _resetForTests } = await import("../../lib/stats-cache.js");
  _resetForTests();
  // Same story for the login rate limiter and the token model's
  // in-memory secret cache + reload timer — both module-level
  // state that survives across test files in the same worker.
  const { _resetLoginRateLimitForTests } = await import(
    "../../controllers/tokens-v1.js"
  );
  _resetLoginRateLimitForTests();
  const { _resetTokenStateForTests } = await import(
    "../../models/token.js"
  );
  _resetTokenStateForTests();

  for (const [key, value] of Object.entries(META)) {
    await db.createMeta({ key, value });
  }
  for (const u of USERS) {
    await db.createUser({
      id: u.id,
      name: u.id,
      password: PASSWORD_HASH,
      secret: "test-secret-" + u.id,
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
        author: "Ville Misaki",
        location: {
          country: p.country,
          place: "",
          coordinates: {
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            altitude: p.altitude ?? null,
          },
        },
      },
      camera: {
        make: p.cameraMake,
        model: p.cameraModel,
        serial: p.cameraSerial ?? "",
      },
      lens: {
        make: p.lensMake ?? "",
        model: p.lensModel ?? "",
        serial: p.lensSerial ?? "",
      },
      exposure: {
        focalLength: p.focalLength,
        focalLength35mmEquiv: p.focalLength35mmEquiv,
        aperture: p.aperture,
        exposureTime: p.exposureTime,
        iso: p.iso,
      },
    });
  }
  for (const [galleryId, photoIds] of Object.entries(LINKS)) {
    await db.linkGalleryPhoto([galleryId], photoIds);
  }
};
