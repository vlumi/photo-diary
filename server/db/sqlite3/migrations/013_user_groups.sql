-- ACL user groups. Adds three tables:
--   group           — group identity (id, title, description)
--   user_group      — many-to-many (user, group) membership
--   group_gallery   — group-level grants on a gallery (mirror of
--                     user_gallery: is_admin upgrades to gallery admin,
--                     hide_map is the privacy override at this layer)
--
-- Group rows compose into the access cascade as one more row source
-- in the MAX over (user, gallery), (group_X, gallery), (:guest, gallery).
-- See `resolveAccessLevel` / `resolveHideMap`.

CREATE TABLE "group" (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE user_group (
  user_id  TEXT NOT NULL,
  group_id TEXT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id)  REFERENCES user(id)   ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES "group"(id) ON DELETE CASCADE
);

CREATE TABLE group_gallery (
  group_id   TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  hide_map   INTEGER,
  PRIMARY KEY (group_id, gallery_id),
  FOREIGN KEY (group_id)   REFERENCES "group"(id) ON DELETE CASCADE,
  FOREIGN KEY (gallery_id) REFERENCES gallery(id) ON DELETE CASCADE
);

UPDATE meta SET value='13' WHERE key='schema_version';
