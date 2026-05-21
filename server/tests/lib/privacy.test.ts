import Database from "better-sqlite3";

// Tests the hide_map cascade resolution against a fresh in-memory SQLite,
// bypassing the dummy driver (which doesn't model user_gallery rows). Mirrors
// the access cascade's gallery-first ordering (see authorizer.ts).
//
// Cascade priority for a non-special gallery request:
//   1. (user_id,   gallery_id)
//   2. (':guest',  gallery_id)
//   3. (user_id,   ':public')
//   4. (':guest',  ':public')
//   5. (user_id,   ':all')
//   6. (':guest',  ':all')
//
// For a :public, :private, or :all request, the :public fall-through is
// skipped — those aren't subsets of :public.

const setupDb = (rows: Array<[string, string, number | null]>) => {
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
  const insert = db.prepare(
    "INSERT INTO user_gallery (user_id, gallery_id, access_level, hide_map) VALUES (?, ?, 1, ?)"
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
  const isSpecial = galleryId.startsWith(":");
  const galleryWhere = isSpecial
    ? "gallery_id IN (?, ':all')"
    : "gallery_id IN (?, ':public', ':all')";
  const galleryOrder = isSpecial
    ? "CASE WHEN gallery_id = ? THEN 0 ELSE 1 END"
    : "CASE WHEN gallery_id = ? THEN 0 WHEN gallery_id = ':public' THEN 1 ELSE 2 END";
  const row = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE (user_id = ? OR user_id = ':guest')
         AND ${galleryWhere}
         AND hide_map IS NOT NULL
       ORDER BY
         ${galleryOrder},
         CASE WHEN user_id = ? THEN 0 ELSE 1 END
       LIMIT 1`
    )
    .get(userId, galleryId, galleryId, userId) as
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

  test("(:guest, gallery) > (user, :all) — gallery-match beats :all-match across users", () => {
    const db = setupDb([
      [":guest", "dailybw", 1],
      ["alice", ":all", 0],
    ]);
    // Gallery-first: (:guest, dailybw) is more specific by gallery than
    // (alice, :all), so guest's per-gallery setting wins even for alice.
    expect(resolve(db, "alice", "dailybw")).toBe(1);
    // bob has no rows, falls through to (:guest, dailybw)
    expect(resolve(db, "bob", "dailybw")).toBe(1);
    // For "travel" (no gallery-specific row), alice falls through to (alice, :all)
    expect(resolve(db, "alice", "travel")).toBe(0);
  });

  test("(user, gallery) > (:guest, gallery) — user beats guest at the same gallery level", () => {
    const db = setupDb([
      [":guest", "dailybw", 1],
      ["alice", "dailybw", 0],
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(0);
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

  test(":public is in the fall-through for non-special gallery requests", () => {
    const db = setupDb([[":guest", ":public", 1]]);
    // Specific gallery → falls through :public → hide
    expect(resolve(db, ":guest", "dailybw")).toBe(1);
    expect(resolve(db, "alice", "dailybw")).toBe(1);
    // :public request → matches directly
    expect(resolve(db, ":guest", ":public")).toBe(1);
  });

  test("specific (:guest, gallery) beats (:guest, :public)", () => {
    const db = setupDb([
      [":guest", ":public", 1],
      [":guest", "dailybw", 0],
    ]);
    expect(resolve(db, ":guest", "dailybw")).toBe(0);
    // Other galleries still get the :public-level hide
    expect(resolve(db, ":guest", "travel")).toBe(1);
  });

  test("(:guest, :public) beats (:guest, :all)", () => {
    const db = setupDb([
      [":guest", ":all", 0],
      [":guest", ":public", 1],
    ]);
    expect(resolve(db, ":guest", "dailybw")).toBe(1);
    // :all wins when the request is :private (no :public fall-through)
    expect(resolve(db, ":guest", ":private")).toBe(0);
    // :all wins when the request is :all itself
    expect(resolve(db, ":guest", ":all")).toBe(0);
  });

  test(":private request skips the :public fall-through", () => {
    const db = setupDb([[":guest", ":public", 1]]);
    // :public being hidden shouldn't affect :private (they're disjoint sets)
    expect(resolve(db, ":guest", ":private")).toBeUndefined();
  });

  test("(user, :public) beats (:guest, :public) at the same gallery level", () => {
    const db = setupDb([
      [":guest", ":public", 1],
      ["alice", ":public", 0],
    ]);
    expect(resolve(db, "alice", "dailybw")).toBe(0);
    expect(resolve(db, "bob", "dailybw")).toBe(1);
  });
});
