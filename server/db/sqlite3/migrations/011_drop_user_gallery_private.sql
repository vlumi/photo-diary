-- Retire the `:private` pseudo-gallery. Its sole role (browsable view
-- of orphan photos) moves to the admin UI's orphan filter. Drop any
-- `user_gallery` rows pointing at it; nothing references `:private`
-- in the schema layer (it was synthesised by the API), so there's
-- no FK to worry about.

DELETE FROM user_gallery WHERE gallery_id = ':private';

UPDATE meta SET value='11' WHERE key='schema_version';
