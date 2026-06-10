-- Per-language overlays for operator-set metadata on photos + galleries.
-- Composes with the geocoded overlay from migration 007 — same `photo_localized`
-- table, three new columns alongside the existing `geocoded_*` ones. The
-- canonical photo / gallery columns stay language-agnostic (operator's
-- primary, whatever language that happens to be); a non-NULL localized
-- column overlays it for `?lang=<that>` reads. Falls back to canonical
-- when the overlay is NULL or the row doesn't exist.
--
-- Galleries get a parallel `gallery_localized` table — only title +
-- description are operator-localizable there.
--
-- `gallery.default_language` is metadata: the language the operator
-- "thinks" the canonical column is in. NULL means "use the instance
-- DEFAULT_LANGUAGE from .env". Server's overlay lookup ignores it; the
-- admin UI uses it to label the canonical input, and the frontend uses
-- it as a fallback when the viewer has no explicit language preference.
-- Geocoded fields are unaffected — Nominatim's coverage is strongest in
-- English, so the geocoded canonical stays EN regardless of this column.

ALTER TABLE photo_localized ADD COLUMN title TEXT;
ALTER TABLE photo_localized ADD COLUMN description TEXT;
ALTER TABLE photo_localized ADD COLUMN place TEXT;

CREATE TABLE gallery_localized (
  gallery_id  TEXT NOT NULL,
  lang        TEXT NOT NULL,
  title       TEXT,
  description TEXT,
  PRIMARY KEY (gallery_id, lang),
  FOREIGN KEY (gallery_id) REFERENCES gallery(id) ON DELETE CASCADE
);

ALTER TABLE gallery ADD COLUMN default_language TEXT;

UPDATE meta SET value='21' WHERE key='schema_version';
