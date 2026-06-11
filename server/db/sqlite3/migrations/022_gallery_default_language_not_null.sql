-- Tighten gallery.default_language to NOT NULL with a baked-in 'en'
-- default. The previous nullable form was a sequencing concession from
-- migration 021 (the column had to be addable to existing rows). Now
-- that the value is meaningful to the canonical/overlay shuffle on
-- language change, we make it impossible to have an absent default.
--
-- Existing NULL rows backfill to 'en'. The shape of the column matches
-- the new-gallery default in the server's create path, which itself
-- reads `.env DEFAULT_LANGUAGE` before falling back to 'en'. Migration
-- can't read .env, so the historical rows uniformly land on 'en';
-- operators who want a different default for an existing gallery flip
-- it via the admin UI (which triggers the canonical/overlay shuffle).
--
-- SQLite has no `ALTER COLUMN ... SET NOT NULL`, so we rebuild the
-- table via the standard create-new / copy / drop / rename dance.
-- The column order matches the existing schema (migration 016 added
-- `icon_source`; migration 021 added `default_language`).

UPDATE gallery SET default_language = 'en' WHERE default_language IS NULL;

CREATE TABLE gallery_new (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  icon TEXT,
  epoch TEXT,
  epoch_type TEXT,
  theme TEXT,
  initial_view TEXT,
  hostname TEXT,
  icon_source TEXT,
  default_language TEXT NOT NULL DEFAULT 'en'
);

INSERT INTO gallery_new (
  id, title, description, icon, epoch, epoch_type, theme,
  initial_view, hostname, icon_source, default_language
)
SELECT
  id, title, description, icon, epoch, epoch_type, theme,
  initial_view, hostname, icon_source, default_language
FROM gallery;

DROP TABLE gallery;
ALTER TABLE gallery_new RENAME TO gallery;

UPDATE meta SET value='22' WHERE key='schema_version';
