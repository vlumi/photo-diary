-- ACL simplification: drop pseudo-gallery wildcards from the cascade,
-- collapse the access_level enum to a boolean `is_admin` on the link
-- row, and promote `(user, :all, admin)` rows to a `user.is_admin`
-- flag. The new model resolves access in three clauses: global admin
-- bypass, then any matching positive grant (user / group / :guest),
-- else deny. No NONE rows.

-- 1. is_admin flag on the user table.
ALTER TABLE user ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- 2. Promote any user with `(user, :all, admin=2)` to a global admin.
UPDATE user
SET is_admin = 1
WHERE id IN (
  SELECT user_id FROM user_gallery
  WHERE gallery_id = ':all' AND access_level = 2
);

-- 3. Fan out `:public` grants to every real gallery before the drop
--    step, so non-admin users with a `:public` grant keep their
--    effective per-gallery access. `INSERT OR IGNORE` keeps any
--    specific-gallery row that already overrides.
INSERT OR IGNORE INTO user_gallery (user_id, gallery_id, access_level, hide_map)
SELECT ug.user_id, g.id, ug.access_level, ug.hide_map
FROM user_gallery ug
CROSS JOIN gallery g
WHERE ug.gallery_id = ':public'
  AND ug.user_id NOT IN (SELECT id FROM user WHERE is_admin = 1);

-- 4. Drop pseudo-gallery rows.
DELETE FROM user_gallery WHERE gallery_id IN (':all', ':public');

-- 5. Drop NONE rows (access_level = 0). Historically rare; no longer
--    expressible under the new model (revoking is deleting the row).
DELETE FROM user_gallery WHERE access_level = 0;

-- 6. Rebuild user_gallery: swap access_level INTEGER for is_admin INTEGER.
--    sqlite-friendly rename-and-rebuild dance.
CREATE TABLE user_gallery_new (
  user_id    TEXT    NOT NULL,
  gallery_id TEXT    NOT NULL,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  hide_map   INTEGER,
  PRIMARY KEY (user_id, gallery_id)
);

INSERT INTO user_gallery_new (user_id, gallery_id, is_admin, hide_map)
SELECT user_id, gallery_id, CASE WHEN access_level = 2 THEN 1 ELSE 0 END, hide_map
FROM user_gallery;

DROP TABLE user_gallery;
ALTER TABLE user_gallery_new RENAME TO user_gallery;

UPDATE meta SET value='12' WHERE key='schema_version';
