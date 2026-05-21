import Database from "better-sqlite3";

// Targeted tests for the user_gallery driver behaviors that the `access.ts`
// bin script depends on. Mirrors the in-memory setup pattern from
// privacy.test.ts so the schema lives next to the assertions and we don't
// have to bootstrap the real driver's module-level config.

const setupDb = () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE user_gallery (
      user_id TEXT,
      gallery_id TEXT,
      access_level INTEGER,
      hide_map INTEGER,
      PRIMARY KEY(user_id, gallery_id)
    );
  `);
  return db;
};

const upsert = (
  db: Database.Database,
  row: {
    user_id: string;
    gallery_id: string;
    access_level?: number | null;
    hide_map?: number | null;
  }
) => {
  const sets: string[] = [];
  if ("access_level" in row) sets.push("access_level = excluded.access_level");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  db.prepare(
    "INSERT INTO user_gallery (user_id, gallery_id, access_level, hide_map) " +
      "VALUES (?, ?, ?, ?) " +
      `ON CONFLICT(user_id, gallery_id) DO UPDATE SET ${sets.join(", ")}`
  ).run(
    row.user_id,
    row.gallery_id,
    row.access_level ?? null,
    row.hide_map ?? null
  );
};

// Mirrors loadUserAccessControl in server/db/sqlite3/index.ts: union of
// (userId, *) and (':guest', *) rows, NULL access_level filtered out so the
// privacy-only rows don't poison the access map.
const accessMap = (
  db: Database.Database,
  userId: string
): Record<string, number> => {
  const rows = db
    .prepare(
      "SELECT user_id, gallery_id, access_level, hide_map FROM user_gallery " +
        "WHERE user_id IN (?, ?)"
    )
    .all(userId, ":guest") as Array<{
    user_id: string;
    gallery_id: string;
    access_level: number | null;
  }>;
  const hasLevel = (r: {
    access_level: number | null;
  }): r is { user_id: string; gallery_id: string; access_level: number } =>
    r.access_level !== null;
  const userRows = rows.filter((r) => r.user_id === userId).filter(hasLevel);
  const guestRows = rows.filter((r) => r.user_id === ":guest").filter(hasLevel);
  return {
    ...Object.fromEntries(guestRows.map((r) => [r.gallery_id, r.access_level])),
    ...Object.fromEntries(userRows.map((r) => [r.gallery_id, r.access_level])),
  };
};

describe("loadUserAccessControl", () => {
  test("NULL access_level rows are filtered out (privacy-only rows don't grant or revoke access)", () => {
    const db = setupDb();
    // alice can view :all globally, and has a hide_map=1 override for the
    // travel gallery (no per-gallery access change — she should still be
    // able to view it via the :all row).
    upsert(db, { user_id: "alice", gallery_id: ":all", access_level: 1 });
    upsert(db, { user_id: "alice", gallery_id: "travel", hide_map: 1 });

    const map = accessMap(db, "alice");

    // The privacy-only row must not show up in the access map — otherwise
    // the authorizer would see "travel" as explicitly set with NULL access
    // and deny instead of falling through to :all.
    expect(map).toEqual({ ":all": 1 });
  });

  test("user rows override :guest rows for the same gallery", () => {
    const db = setupDb();
    upsert(db, { user_id: ":guest", gallery_id: ":all", access_level: 1 });
    upsert(db, { user_id: "alice", gallery_id: ":all", access_level: 2 });

    expect(accessMap(db, "alice")).toEqual({ ":all": 2 });
  });

  test("user with no rows inherits the :guest defaults", () => {
    const db = setupDb();
    upsert(db, { user_id: ":guest", gallery_id: ":all", access_level: 1 });

    expect(accessMap(db, "bob")).toEqual({ ":all": 1 });
  });
});

describe("upsertUserGallery", () => {
  test("creates a new row when none exists", () => {
    const db = setupDb();
    upsert(db, { user_id: "alice", gallery_id: ":all", access_level: 2 });

    const row = db
      .prepare("SELECT * FROM user_gallery WHERE user_id = ? AND gallery_id = ?")
      .get("alice", ":all");
    expect(row).toEqual({
      user_id: "alice",
      gallery_id: ":all",
      access_level: 2,
      hide_map: null,
    });
  });

  test("updates only the columns that were passed (preserves the rest)", () => {
    const db = setupDb();
    upsert(db, {
      user_id: "alice",
      gallery_id: "travel",
      access_level: 1,
      hide_map: 1,
    });
    // Update only access_level — hide_map should stay at 1.
    upsert(db, { user_id: "alice", gallery_id: "travel", access_level: 2 });

    const row = db
      .prepare("SELECT * FROM user_gallery WHERE user_id = ? AND gallery_id = ?")
      .get("alice", "travel");
    expect(row).toEqual({
      user_id: "alice",
      gallery_id: "travel",
      access_level: 2,
      hide_map: 1,
    });
  });

  test("can set hide_map=NULL to clear an override without touching access", () => {
    const db = setupDb();
    upsert(db, {
      user_id: "alice",
      gallery_id: "travel",
      access_level: 1,
      hide_map: 1,
    });
    upsert(db, { user_id: "alice", gallery_id: "travel", hide_map: null });

    const row = db
      .prepare("SELECT * FROM user_gallery WHERE user_id = ? AND gallery_id = ?")
      .get("alice", "travel");
    expect(row).toEqual({
      user_id: "alice",
      gallery_id: "travel",
      access_level: 1,
      hide_map: null,
    });
  });
});
