-- Rename `is_admin` → `is_editor` on `user_gallery` and
-- `group_gallery`. Pure naming change: the column already does
-- what its new name describes — flag for "user / group has the
-- editor tier on this gallery." Matches the server-side
-- `authorizeGalleryEditor` / `isGalleryEditor` vocabulary and
-- the UI's `Editor` column label so the last `admin` mention
-- on a gallery-editor surface goes away.

ALTER TABLE user_gallery RENAME COLUMN is_admin TO is_editor;
ALTER TABLE "group_gallery" RENAME COLUMN is_admin TO is_editor;

UPDATE meta SET value='19' WHERE key='schema_version';
