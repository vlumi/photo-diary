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
    expect(schemaVersion(db)).toBe(2);
    expect(tableNames(db)).toEqual(
      expect.arrayContaining([
        "acl",
        "gallery",
        "gallery_photo",
        "meta",
        "photo",
        "user",
      ])
    );
    // 002 rebuilt gallery_photo with singular FK refs.
    expect(gallerPhotoFkRefs(db).sort()).toEqual(["gallery", "photo"]);
  });

  test("re-running on an up-to-date DB is a no-op", () => {
    const db = open();
    migrate(db);
    const versionBefore = schemaVersion(db);
    migrate(db);
    expect(schemaVersion(db)).toBe(versionBefore);
  });

  test("DB stuck at v1 (legacy prod) advances to v2 and fixes the FK", () => {
    const db = open();
    // Bootstrap a v1-state DB manually — same shape as production at the
    // moment 0.6.0 shipped: schema_version=1, gallery_photo FK points at the
    // never-existing `photos` / `galleries` tables.
    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
      INSERT INTO meta VALUES ('schema_version', '1');
      CREATE TABLE gallery (id TEXT PRIMARY KEY);
      CREATE TABLE photo (id TEXT PRIMARY KEY);
      CREATE TABLE gallery_photo (
        gallery_id TEXT,
        photo_id TEXT,
        PRIMARY KEY(photo_id, gallery_id),
        FOREIGN KEY(photo_id) REFERENCES photos(id),
        FOREIGN KEY(gallery_id) REFERENCES galleries(id)
      );
    `);
    expect(schemaVersion(db)).toBe(1);
    expect(gallerPhotoFkRefs(db).sort()).toEqual(["galleries", "photos"]);

    migrate(db);

    expect(schemaVersion(db)).toBe(2);
    expect(gallerPhotoFkRefs(db).sort()).toEqual(["gallery", "photo"]);
  });

  test("002 preserves rows from gallery_photo", () => {
    const db = open();
    migrate(db);
    db.exec(`
      INSERT INTO gallery (id) VALUES ('g1');
      INSERT INTO photo (id) VALUES ('p1');
      INSERT INTO gallery_photo (gallery_id, photo_id) VALUES ('g1', 'p1');
    `);
    // Force a rebuild by knocking the version back, then re-running 002.
    db.prepare("UPDATE meta SET value='1' WHERE key='schema_version'").run();
    migrate(db);
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
