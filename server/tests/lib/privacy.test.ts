import Database from "better-sqlite3";

// Tests the hide_map cascade against a fresh in-memory SQLite.
// Resolution order:
//
//   1. user.is_admin = true                       → 0 (show, bypass)
//   2. user-row hide_map (non-null)               → use it
//   3. group rows the user inherits:
//        privacy-first MAX (any 1 wins over 0)    → use it
//   4. :guest-row hide_map (non-null)             → use it
//   5. else                                       → undefined

interface UserRowSeed {
  user_id: string;
  gallery_id: string;
  hide_map: number | null;
}
interface GroupRowSeed {
  group_id: string;
  gallery_id: string;
  hide_map: number | null;
}

const setupDb = (
  rows: UserRowSeed[],
  globalAdmins: string[] = [],
  groupRows: GroupRowSeed[] = [],
  memberships: Array<[string, string]> = []
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
    CREATE TABLE "group" (id TEXT PRIMARY KEY);
    CREATE TABLE user_group (
      user_id TEXT,
      group_id TEXT,
      PRIMARY KEY(user_id, group_id)
    );
    CREATE TABLE group_gallery (
      group_id TEXT,
      gallery_id TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      hide_map INTEGER,
      PRIMARY KEY(group_id, gallery_id)
    );
  `);
  const insertUser = db.prepare(
    "INSERT OR IGNORE INTO user (id, is_admin) VALUES (?, ?)"
  );
  for (const id of globalAdmins) insertUser.run(id, 1);
  for (const r of rows) if (r.user_id !== ":guest") insertUser.run(r.user_id, 0);
  for (const [u] of memberships) insertUser.run(u, 0);
  const insertUserGrant = db.prepare(
    "INSERT INTO user_gallery (user_id, gallery_id, is_admin, hide_map) VALUES (?, ?, 0, ?)"
  );
  for (const r of rows) insertUserGrant.run(r.user_id, r.gallery_id, r.hide_map);
  const insertGroup = db.prepare(
    'INSERT OR IGNORE INTO "group" (id) VALUES (?)'
  );
  for (const r of groupRows) insertGroup.run(r.group_id);
  for (const [, g] of memberships) insertGroup.run(g);
  const insertGroupGrant = db.prepare(
    "INSERT INTO group_gallery (group_id, gallery_id, is_admin, hide_map) VALUES (?, ?, 0, ?)"
  );
  for (const r of groupRows)
    insertGroupGrant.run(r.group_id, r.gallery_id, r.hide_map);
  const insertMember = db.prepare(
    "INSERT INTO user_group (user_id, group_id) VALUES (?, ?)"
  );
  for (const [u, g] of memberships) insertMember.run(u, g);
  return db;
};

// Mirror of the resolveHideMap implementation in db/sqlite3/index.ts.
const resolve = (
  db: Database.Database,
  userId: string,
  galleryId: string
): number | undefined => {
  const userRow = db
    .prepare("SELECT is_admin FROM user WHERE id = ?")
    .get(userId) as { is_admin: number } | undefined;
  if (userRow && userRow.is_admin) return 0;
  const own = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE user_id = ? AND gallery_id = ? AND hide_map IS NOT NULL`
    )
    .get(userId, galleryId) as { hide_map: number } | undefined;
  if (own) return own.hide_map;
  const group = db
    .prepare(
      `SELECT MAX(hide_map) AS hide_map FROM group_gallery
       WHERE gallery_id = ? AND hide_map IS NOT NULL
         AND group_id IN (SELECT group_id FROM user_group WHERE user_id = ?)`
    )
    .get(galleryId, userId) as { hide_map: number | null } | undefined;
  if (group?.hide_map !== null && group?.hide_map !== undefined)
    return group.hide_map;
  const guest = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE user_id = ':guest' AND gallery_id = ? AND hide_map IS NOT NULL`
    )
    .get(galleryId) as { hide_map: number } | undefined;
  return guest?.hide_map;
};

describe("hide_map cascade (post-#270, with groups)", () => {
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

  test("group row hides for member without own row", () => {
    const db = setupDb(
      [],
      [],
      [{ group_id: "family", gallery_id: "dailybw", hide_map: 1 }],
      [["alice", "family"]]
    );
    expect(resolve(db, "alice", "dailybw")).toBe(1);
    // Non-member sees no rule.
    expect(resolve(db, "bob", "dailybw")).toBeUndefined();
  });

  test("user-row beats group row", () => {
    const db = setupDb(
      [{ user_id: "alice", gallery_id: "dailybw", hide_map: 0 }],
      [],
      [{ group_id: "family", gallery_id: "dailybw", hide_map: 1 }],
      [["alice", "family"]]
    );
    expect(resolve(db, "alice", "dailybw")).toBe(0);
  });

  test("group row beats :guest", () => {
    const db = setupDb(
      [{ user_id: ":guest", gallery_id: "dailybw", hide_map: 0 }],
      [],
      [{ group_id: "family", gallery_id: "dailybw", hide_map: 1 }],
      [["alice", "family"]]
    );
    expect(resolve(db, "alice", "dailybw")).toBe(1);
  });

  test("two group rows on the same gallery → MAX (privacy-first)", () => {
    const db = setupDb(
      [],
      [],
      [
        { group_id: "family", gallery_id: "dailybw", hide_map: 0 },
        { group_id: "friends", gallery_id: "dailybw", hide_map: 1 },
      ],
      [
        ["alice", "family"],
        ["alice", "friends"],
      ]
    );
    expect(resolve(db, "alice", "dailybw")).toBe(1);
  });

  test("null user.hide_map falls through to group, then :guest", () => {
    const db = setupDb(
      [
        { user_id: "alice", gallery_id: "dailybw", hide_map: null },
        { user_id: ":guest", gallery_id: "dailybw", hide_map: 1 },
      ],
      [],
      [{ group_id: "family", gallery_id: "dailybw", hide_map: 0 }],
      [["alice", "family"]]
    );
    // Group says show; group layer wins over :guest layer.
    expect(resolve(db, "alice", "dailybw")).toBe(0);
  });

  test(":guest user has no groups, falls through to :guest's rows only", () => {
    const db = setupDb(
      [{ user_id: ":guest", gallery_id: "dailybw", hide_map: 0 }],
      [],
      [{ group_id: "family", gallery_id: "dailybw", hide_map: 1 }],
      [] // :guest is not in any group
    );
    expect(resolve(db, ":guest", "dailybw")).toBe(0);
  });
});
