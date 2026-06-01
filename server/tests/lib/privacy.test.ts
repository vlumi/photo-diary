import Database from "better-sqlite3";

// Tests the post-#394 hide_map cascade resolution against a fresh
// in-memory SQLite, bypassing the dummy driver. The new model is:
//
//   1. user.is_admin = true → 0 (show, bypass)
//   2. first non-null hide_map from (user, gallery), (:guest, gallery),
//      with the user row beating :guest on a tie
//   3. else → undefined (defaults to show downstream)
//
// No pseudo-gallery wildcards (`:all` / `:public`) — those lost their
// cascade role in #394.

interface SeedRow {
  user_id: string;
  gallery_id: string;
  hide_map: number | null;
}

const setupDb = (
  rows: SeedRow[],
  globalAdmins: string[] = []
) => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY,
      is_admin INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE user_gallery (
      user_id TEXT,
      gallery_id TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      hide_map INTEGER,
      PRIMARY KEY(user_id, gallery_id)
    );
  `);
  const insertUser = db.prepare(
    "INSERT OR IGNORE INTO user (id, is_admin) VALUES (?, ?)"
  );
  for (const id of globalAdmins) insertUser.run(id, 1);
  // Make sure every (user_id) appearing in seed rows has a user row,
  // because resolveHideMap looks the user up to check is_admin.
  for (const r of rows) {
    if (r.user_id !== ":guest") insertUser.run(r.user_id, 0);
  }
  const insertGrant = db.prepare(
    "INSERT INTO user_gallery (user_id, gallery_id, is_admin, hide_map) VALUES (?, ?, 0, ?)"
  );
  for (const r of rows) {
    insertGrant.run(r.user_id, r.gallery_id, r.hide_map);
  }
  return db;
};

const resolve = (
  db: Database.Database,
  userId: string,
  galleryId: string
): number | undefined => {
  const userRow = db
    .prepare("SELECT is_admin FROM user WHERE id = ?")
    .get(userId) as { is_admin: number } | undefined;
  if (userRow && userRow.is_admin) return 0;
  const row = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE user_id IN (?, ':guest')
         AND gallery_id = ?
         AND hide_map IS NOT NULL
       ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END
       LIMIT 1`
    )
    .get(userId, galleryId, userId) as { hide_map: number } | undefined;
  return row?.hide_map;
};

describe("hide_map cascade (post-#394)", () => {
  test("no rows → undefined (defaults to show)", () => {
    const db = setupDb([]);
    expect(resolve(db, "alice", "dailybw")).toBeUndefined();
  });

  test("global admin → 0 (show, bypass) regardless of :guest hide", () => {
    const db = setupDb(
      [{ user_id: ":guest", gallery_id: "dailybw", hide_map: 1 }],
      ["alice"]
    );
    expect(resolve(db, "alice", "dailybw")).toBe(0);
    expect(resolve(db, ":guest", "dailybw")).toBe(1);
  });

  test("(:guest, gallery) hides for non-admin user without own row", () => {
    const db = setupDb([
      { user_id: ":guest", gallery_id: "dailybw", hide_map: 1 },
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(1);
  });

  test("(user, gallery) overrides (:guest, gallery)", () => {
    const db = setupDb([
      { user_id: ":guest", gallery_id: "dailybw", hide_map: 1 },
      { user_id: "alice", gallery_id: "dailybw", hide_map: 0 },
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(0);
    expect(resolve(db, "bob", "dailybw")).toBe(1);
  });

  test("null user.hide_map falls through to :guest's value", () => {
    const db = setupDb([
      { user_id: "alice", gallery_id: "dailybw", hide_map: null },
      { user_id: ":guest", gallery_id: "dailybw", hide_map: 1 },
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(1);
  });

  test("no row at all → undefined (defaults to show)", () => {
    const db = setupDb([
      { user_id: ":guest", gallery_id: "other-gallery", hide_map: 1 },
    ]);
    expect(resolve(db, "alice", "dailybw")).toBeUndefined();
  });

  test(":guest user uses :guest's own rows", () => {
    const db = setupDb([
      { user_id: ":guest", gallery_id: "dailybw", hide_map: 0 },
    ]);
    expect(resolve(db, ":guest", "dailybw")).toBe(0);
    expect(resolve(db, ":guest", "other")).toBeUndefined();
  });
});
