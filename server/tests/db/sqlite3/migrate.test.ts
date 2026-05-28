import Database from "better-sqlite3";

import { migrate } from "../../../db/sqlite3/migrate.js";

const open = (): Database.Database => new Database(":memory:");

const schemaVersion = (db: Database.Database): number | null => {
  try {
    const row = db
      .prepare("SELECT value FROM meta WHERE key='schema_version'")
      .get() as { value: string } | undefined;
    return row ? Number(row.value) : null;
  } catch {
    return null;
  }
};

const tableNames = (db: Database.Database): string[] =>
  (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as { name: string }[]
  ).map((r) => r.name);

const gallerPhotoFkRefs = (db: Database.Database): string[] =>
  (db.pragma("foreign_key_list(gallery_photo)") as { table: string }[]).map(
    (r) => r.table
  );

describe("migrate", () => {
  test("fresh DB runs every migration and lands at the highest version", () => {
    const db = open();
    migrate(db);
    expect(schemaVersion(db)).toBe(7);
    expect(tableNames(db)).toEqual(
      expect.arrayContaining([
        "gallery",
        "gallery_photo",
        "meta",
        "photo",
        "session",
        "user",
        "user_gallery",
      ])
    );
    // 002 rebuilt gallery_photo with singular FK refs.
    expect(gallerPhotoFkRefs(db).sort()).toEqual(["gallery", "photo"]);
    // 003 added hide_map; 004 renamed acl → user_gallery and level → access_level.
    const userGalleryCols = (
      db.pragma("table_info(user_gallery)") as { name: string }[]
    ).map((r) => r.name);
    expect(userGalleryCols).toContain("hide_map");
    expect(userGalleryCols).toContain("access_level");
    expect(userGalleryCols).not.toContain("level");
  });

  test("re-running on an up-to-date DB is a no-op", () => {
    const db = open();
    migrate(db);
    const versionBefore = schemaVersion(db);
    migrate(db);
    expect(schemaVersion(db)).toBe(versionBefore);
  });

  test("DB stuck at v1 (legacy prod) advances forward, fixes the FK, preserves rows", () => {
    const db = open();
    // Bootstrap a v1-state DB manually — same shape as production at the
    // moment 0.6.0 shipped: schema_version=1, gallery_photo FK points at the
    // never-existing `photos` / `galleries` tables, no hide_map column yet.
    // Pre-seed a gallery_photo row so we can verify 002's rebuild preserves
    // existing data. FKs off during seed because the broken FK targets
    // `photos`/`galleries` (plural) which we never create.
    db.pragma("foreign_keys = OFF");
    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
      INSERT INTO meta VALUES ('schema_version', '1');
      CREATE TABLE gallery (id TEXT PRIMARY KEY);
      CREATE TABLE acl (
        user_id TEXT,
        gallery_id TEXT,
        level INTEGER,
        PRIMARY KEY(user_id, gallery_id)
      );
      CREATE TABLE photo (id TEXT PRIMARY KEY);
      CREATE TABLE gallery_photo (
        gallery_id TEXT,
        photo_id TEXT,
        PRIMARY KEY(photo_id, gallery_id),
        FOREIGN KEY(photo_id) REFERENCES photos(id),
        FOREIGN KEY(gallery_id) REFERENCES galleries(id)
      );
      INSERT INTO gallery (id) VALUES ('g1');
      INSERT INTO photo (id) VALUES ('p1');
      INSERT INTO gallery_photo (gallery_id, photo_id) VALUES ('g1', 'p1');
    `);
    expect(schemaVersion(db)).toBe(1);
    expect(gallerPhotoFkRefs(db).sort()).toEqual(["galleries", "photos"]);

    migrate(db);

    expect(schemaVersion(db)).toBe(7);
    expect(gallerPhotoFkRefs(db).sort()).toEqual(["gallery", "photo"]);
    const rows = db.prepare("SELECT * FROM gallery_photo").all();
    expect(rows).toEqual([{ gallery_id: "g1", photo_id: "p1" }]);
  });

  test("throws when DB version is ahead of migrations on disk", () => {
    const db = open();
    migrate(db);
    db.prepare("UPDATE meta SET value='999' WHERE key='schema_version'").run();
    expect(() => migrate(db)).toThrow(/newer version of the code/);
  });
});
