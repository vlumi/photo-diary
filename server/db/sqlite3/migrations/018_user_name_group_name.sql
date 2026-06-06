-- Add user.name as a mutable display label (separate from the
-- immutable user.id login handle). Rename group.title → group.name
-- so user / group / gallery share consistent terms: gallery.title
-- (curatorial) stays; user.name + group.name are identity labels.
--
-- Existing rows backfill name = id so display behaviour matches
-- pre-migration (the id was doing double duty as a label).

ALTER TABLE user ADD COLUMN name TEXT NOT NULL DEFAULT '';
UPDATE user SET name = id WHERE name = '';

ALTER TABLE "group" RENAME COLUMN title TO name;

UPDATE meta SET value='18' WHERE key='schema_version';
