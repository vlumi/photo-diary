import Database from "better-sqlite3";

// Tests the 4-cell ACL cascade resolution against a fresh in-memory SQLite,
// bypassing the dummy driver (which doesn't model ACL rows).
//
// Cascade priority (most specific wins):
//   1. (user_id, gallery_id)
//   2. (user_id, ':all')
//   3. (':guest', gallery_id)
//   4. (':guest', ':all')

const setupDb = (rows: Array<[string, string, number | null]>) => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE acl (
      user_id TEXT,
      gallery_id TEXT,
      level INTEGER,
      hide_map INTEGER,
      PRIMARY KEY(user_id, gallery_id)
    );
  `);
  const insert = db.prepare(
    "INSERT INTO acl (user_id, gallery_id, level, hide_map) VALUES (?, ?, 1, ?)"
  );
  for (const [user_id, gallery_id, hide_map] of rows) {
    insert.run(user_id, gallery_id, hide_map);
  }
  return db;
};

const resolve = (
  db: Database.Database,
  userId: string,
  galleryId: string
): number | undefined => {
  const row = db
    .prepare(
      `SELECT hide_map FROM acl
       WHERE (user_id = ? OR user_id = ':guest')
         AND (gallery_id = ? OR gallery_id = ':all')
         AND hide_map IS NOT NULL
       ORDER BY
         CASE WHEN user_id = ? THEN 0 ELSE 1 END,
         CASE WHEN gallery_id = ? THEN 0 ELSE 1 END
       LIMIT 1`
    )
    .get(userId, galleryId, userId, galleryId) as
    | { hide_map: number }
    | undefined;
  return row?.hide_map;
};

describe("hide_map ACL cascade", () => {
  test("no rows → undefined (defaults to show)", () => {
    const db = setupDb([]);
    expect(resolve(db, "alice", "dailybw")).toBeUndefined();
  });

  test("(:guest, :all) = 1 → global hide applies to logged-in users too", () => {
    const db = setupDb([[":guest", ":all", 1]]);
    expect(resolve(db, "alice", "dailybw")).toBe(1);
    expect(resolve(db, ":guest", "dailybw")).toBe(1);
  });

  test("(:guest, gallery) > (:guest, :all) — more specific gallery wins", () => {
    const db = setupDb([
      [":guest", ":all", 1],
      [":guest", "dailybw", 0],
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(0);
    expect(resolve(db, "alice", "travel")).toBe(1);
  });

  test("(user, :all) > (:guest, gallery) — user-match beats gallery-match", () => {
    const db = setupDb([
      [":guest", "dailybw", 1],
      ["alice", ":all", 0],
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(0);
    // bob has no rows, falls through to (:guest, dailybw)
    expect(resolve(db, "bob", "dailybw")).toBe(1);
  });

  test("(user, gallery) > (user, :all) — most specific dominates", () => {
    const db = setupDb([
      ["alice", ":all", 1],
      ["alice", "dailybw", 0],
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(0);
    expect(resolve(db, "alice", "travel")).toBe(1);
  });

  test("null hide_map at a level → falls through to the next level", () => {
    const db = setupDb([
      ["alice", "dailybw", null],
      [":guest", "dailybw", 1],
    ]);
    // alice's own row says "no opinion"; falls through to gallery-level
    expect(resolve(db, "alice", "dailybw")).toBe(1);
  });

  test("logged-in user without any rows uses :guest's defaults", () => {
    const db = setupDb([[":guest", ":all", 1]]);
    expect(resolve(db, "newuser", "anygallery")).toBe(1);
  });

  test(":guest user uses :guest's rows (no special handling)", () => {
    const db = setupDb([
      [":guest", ":all", 1],
      [":guest", "dailybw", 0],
    ]);
    expect(resolve(db, ":guest", "dailybw")).toBe(0);
    expect(resolve(db, ":guest", "other")).toBe(1);
  });
});
