-- Force user/gallery/group ids (and the FK columns that point at them)
-- to lowercase. Tightens case-handling at the schema layer so login
-- ergonomics + collision guards become structural instead of runtime
-- LOWER() callsites.
--
-- The migration runner disables FK checks around each migration
-- (`PRAGMA foreign_keys = OFF`) and re-runs `foreign_key_check` after
-- commit. Both parent and child rows here use LOWER(), so the
-- referrers stay consistent with their re-cased parents.
--
-- If the existing data has case-only collisions (e.g. both `Admin`
-- and `admin` as separate user rows), the parent UPDATE fails with
-- `UNIQUE constraint failed`. The transaction rolls back and the
-- server refuses to start until the operator merges or renames the
-- conflicting row. Single-operator instances historically use
-- lowercase ids; collisions in practice are unlikely.

UPDATE user SET id = LOWER(id) WHERE id != LOWER(id);
UPDATE user_gallery SET user_id = LOWER(user_id) WHERE user_id != LOWER(user_id);
UPDATE user_group SET user_id = LOWER(user_id) WHERE user_id != LOWER(user_id);
UPDATE session SET user_id = LOWER(user_id) WHERE user_id != LOWER(user_id);

UPDATE gallery SET id = LOWER(id) WHERE id != LOWER(id);
UPDATE user_gallery SET gallery_id = LOWER(gallery_id) WHERE gallery_id != LOWER(gallery_id);
UPDATE group_gallery SET gallery_id = LOWER(gallery_id) WHERE gallery_id != LOWER(gallery_id);
UPDATE gallery_photo SET gallery_id = LOWER(gallery_id) WHERE gallery_id != LOWER(gallery_id);

UPDATE "group" SET id = LOWER(id) WHERE id != LOWER(id);
UPDATE user_group SET group_id = LOWER(group_id) WHERE group_id != LOWER(group_id);
UPDATE group_gallery SET group_id = LOWER(group_id) WHERE group_id != LOWER(group_id);

UPDATE meta SET value='17' WHERE key='schema_version';
