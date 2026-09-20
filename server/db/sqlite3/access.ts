import { NotFoundError } from "../../lib/errors.js";
import {
  type Group,
  type GroupGalleryRow,
  type GroupRow,
  type UserGalleryRow,
} from "./schema.js";
import { SCHEMA, db } from "./connection.js";

// Resolve access for (userId, galleryId):
//   1. user.is_admin = true                       → global admin (bypass).
//   2. MAX(is_editor) over matching positive rows from
//        user_gallery (user or :guest, this gallery)
//        group_gallery (any group the user belongs to, this gallery)
//      row present → view; is_editor=1 upgrades to gallery editor.
//   3. else                                       → deny.
export const resolveAccessLevel = async (
  userId: string,
  galleryId: string
): Promise<{
  hasAccess: boolean;
  isEditor: boolean;
  canSeePrivate: boolean;
}> => {
  const userRow = db
    .prepare("SELECT is_admin FROM user WHERE id = ?")
    .get(userId) as { is_admin: number } | undefined;
  if (userRow && userRow.is_admin) {
    return { hasAccess: true, isEditor: true, canSeePrivate: true };
  }
  // UNION ALL of the two row sources, then MAX each flag. Sub-queries are
  // cheap on the small tables involved; explicit form reads better than a
  // JOIN.
  const grantRow = db
    .prepare(
      `SELECT MAX(is_editor) AS is_editor,
              MAX(can_see_private) AS can_see_private
         FROM (
           SELECT is_editor, can_see_private FROM user_gallery
             WHERE user_id IN (?, ':guest') AND gallery_id = ?
           UNION ALL
           SELECT is_editor, can_see_private FROM group_gallery
             WHERE gallery_id = ?
               AND group_id IN (SELECT group_id FROM user_group WHERE user_id = ?)
         )`
    )
    .get(userId, galleryId, galleryId, userId) as
    | { is_editor: number | null; can_see_private: number | null }
    | undefined;
  if (grantRow?.is_editor === null || grantRow?.is_editor === undefined) {
    return { hasAccess: false, isEditor: false, canSeePrivate: false };
  }
  const isEditor = !!grantRow.is_editor;
  // Editors implicitly see private — they need it to flip the flag.
  const canSeePrivate = isEditor || !!grantRow.can_see_private;
  return { hasAccess: true, isEditor, canSeePrivate };
};

export const loadUserGalleryRows = async (
  filter: { userId?: string; galleryId?: string } = {}
): Promise<UserGalleryRow[]> => {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filter.userId) {
    conditions.push("user_id = ?");
    values.push(filter.userId);
  }
  if (filter.galleryId) {
    conditions.push("gallery_id = ?");
    values.push(filter.galleryId);
  }
  return db
    .prepare(SCHEMA.userGallery.buildSelectQuery(conditions))
    .all(...values) as UserGalleryRow[];
};

export const upsertUserGallery = async (
  row: {
    user_id: string;
    gallery_id: string;
    is_editor?: boolean;
    hide_map?: number | null;
    can_see_private?: boolean;
  }
): Promise<void> => {
  // Only touch the columns the caller passed (everything else is preserved on
  // conflict). Done with SQLite's INSERT ON CONFLICT DO UPDATE so a single
  // statement handles both the create and the partial-update path. When no
  // mutable columns were passed the conflict clause must be DO NOTHING —
  // SQLite rejects an empty DO UPDATE SET as a syntax error.
  const sets: string[] = [];
  if ("is_editor" in row) sets.push("is_editor = excluded.is_editor");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  if ("can_see_private" in row)
    sets.push("can_see_private = excluded.can_see_private");
  const conflict =
    sets.length > 0
      ? `DO UPDATE SET ${sets.join(", ")}`
      : "DO NOTHING";
  const query =
    "INSERT INTO user_gallery (user_id, gallery_id, is_editor, hide_map, can_see_private) " +
    "VALUES (?, ?, ?, ?, ?) " +
    `ON CONFLICT(user_id, gallery_id) ${conflict}`;
  db.prepare(query).run(
    row.user_id,
    row.gallery_id,
    row.is_editor ? 1 : 0,
    row.hide_map ?? null,
    row.can_see_private ? 1 : 0
  );
};

export const deleteUserGallery = async (
  userId: string,
  galleryId: string
): Promise<void> => {
  db.prepare(SCHEMA.userGallery.buildDeleteByIdQuery()).run([
    userId,
    galleryId,
  ]);
};

// Groups
export const loadGroups = async () => {
  const rows = db.prepare(SCHEMA.group.buildSelectQuery()).all() as GroupRow[];
  return rows.map(SCHEMA.group.mapRow);
};
export const loadGroup = async (groupId: string) => {
  const row = db.prepare(SCHEMA.group.buildSelectByIdQuery()).get(groupId) as
    | GroupRow
    | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.group.mapRow(row);
};
export const createGroup = async (group: Group) => {
  db.prepare(SCHEMA.group.buildCreateQuery()).run(SCHEMA.group.mapInsert(group));
};
export const updateGroup = async (groupId: string, patch: Partial<Group>) => {
  const { query, values } = SCHEMA.group.buildUpdateByIdQuery(patch);
  if (!query || !values) return;
  db.prepare(query).run([...values, groupId]);
};
export const deleteGroup = async (groupId: string): Promise<void> => {
  // FK cascade clears user_group + group_gallery rows automatically.
  db.prepare(SCHEMA.group.buildDeleteByIdQuery()).run([groupId]);
};

// Group members (user_group)
export const loadGroupMembers = async (groupId: string): Promise<string[]> => {
  const rows = db
    .prepare("SELECT user_id FROM user_group WHERE group_id = ? ORDER BY user_id ASC")
    .all(groupId) as Array<{ user_id: string }>;
  return rows.map((r) => r.user_id);
};
export const loadUserGroups = async (userId: string): Promise<string[]> => {
  const rows = db
    .prepare("SELECT group_id FROM user_group WHERE user_id = ? ORDER BY group_id ASC")
    .all(userId) as Array<{ group_id: string }>;
  return rows.map((r) => r.group_id);
};
export const addUserGroup = async (userId: string, groupId: string): Promise<void> => {
  db.prepare(
    "INSERT OR IGNORE INTO user_group (user_id, group_id) VALUES (?, ?)"
  ).run(userId, groupId);
};
export const removeUserGroup = async (
  userId: string,
  groupId: string
): Promise<void> => {
  db.prepare(
    "DELETE FROM user_group WHERE user_id = ? AND group_id = ?"
  ).run(userId, groupId);
};

// Group grants on galleries (group_gallery)
export const loadGroupGalleryRows = async (
  filter: { groupId?: string; galleryId?: string } = {}
): Promise<GroupGalleryRow[]> => {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filter.groupId) {
    conditions.push("group_id = ?");
    values.push(filter.groupId);
  }
  if (filter.galleryId) {
    conditions.push("gallery_id = ?");
    values.push(filter.galleryId);
  }
  return db
    .prepare(SCHEMA.groupGallery.buildSelectQuery(conditions))
    .all(...values) as GroupGalleryRow[];
};
export const upsertGroupGallery = async (row: {
  group_id: string;
  gallery_id: string;
  is_editor?: boolean;
  hide_map?: number | null;
  can_see_private?: boolean;
}): Promise<void> => {
  // Mirror upsertUserGallery: DO NOTHING when no mutable columns were
  // passed, else DO UPDATE the supplied subset.
  const sets: string[] = [];
  if ("is_editor" in row) sets.push("is_editor = excluded.is_editor");
  if ("hide_map" in row) sets.push("hide_map = excluded.hide_map");
  if ("can_see_private" in row)
    sets.push("can_see_private = excluded.can_see_private");
  const conflict =
    sets.length > 0
      ? `DO UPDATE SET ${sets.join(", ")}`
      : "DO NOTHING";
  const query =
    "INSERT INTO group_gallery (group_id, gallery_id, is_editor, hide_map, can_see_private) " +
    "VALUES (?, ?, ?, ?, ?) " +
    `ON CONFLICT(group_id, gallery_id) ${conflict}`;
  db.prepare(query).run(
    row.group_id,
    row.gallery_id,
    row.is_editor ? 1 : 0,
    row.hide_map ?? null,
    row.can_see_private ? 1 : 0
  );
};
export const deleteGroupGallery = async (
  groupId: string,
  galleryId: string
): Promise<void> => {
  db.prepare(SCHEMA.groupGallery.buildDeleteByIdQuery()).run([
    groupId,
    galleryId,
  ]);
};
// Resolve the privacy cascade for (userId, galleryId).
//   1. user.is_admin = true                       → 0 (show, bypass).
//   2. user-row hide_map (non-null)               → use it.
//   3. group-row hide_map across user's groups:
//        privacy-first within the layer — any 1 (hide) wins over 0 (show).
//   4. :guest-row hide_map (non-null)             → use it.
//   5. else                                       → undefined (default show).
export const resolveHideMap = async (
  userId: string,
  galleryId: string
): Promise<number | undefined> => {
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
       WHERE gallery_id = ?
         AND hide_map IS NOT NULL
         AND group_id IN (SELECT group_id FROM user_group WHERE user_id = ?)`
    )
    .get(galleryId, userId) as { hide_map: number | null } | undefined;
  if (group?.hide_map !== null && group?.hide_map !== undefined) {
    return group.hide_map;
  }
  const guest = db
    .prepare(
      `SELECT hide_map FROM user_gallery
       WHERE user_id = ':guest' AND gallery_id = ? AND hide_map IS NOT NULL`
    )
    .get(galleryId) as { hide_map: number } | undefined;
  return guest?.hide_map;
};
