-- Collapse saved filters into the gallery namespace as a third kind
-- of gallery, alongside real and hybrid. A saved-filter gallery has
-- one source gallery + a JSON definition (filter + dateRange); the
-- read path resolves the gallery to its source's photos with the
-- definition merged into the request. Browsing, stats, ACL,
-- localization and the picker all reuse the gallery code paths.
--
-- Schema changes:
--
--   - `gallery.type` enum: `real` | `hybrid` | `saved_filter`. Existing
--     hybrids (rows with virtual_gallery_source entries) are stamped
--     `hybrid`; everything else stays `real`. The enum makes the kind
--     explicit, avoids a JOIN to dispatch in the read path, and lets
--     future kinds slot in.
--
--   - `gallery_saved_filter` side table holds the source pointer and
--     the definition blob, keyed by gallery_id. Cascade-delete on the
--     gallery row removes the side row. The source FK has no cascade
--     — deleting a real gallery that's referenced as a saved-filter
--     source is left as a sanity error rather than silently nuking the
--     saved-filter gallery.
--
-- Data move:
--
--   - Each pre-existing `saved_filter` row becomes a gallery row
--     (id = saved_filter.id, title/description copied, default_language
--     inherited from source) plus a `gallery_saved_filter` row carrying
--     source + definition. Per-lang overlays move from
--     `saved_filter_localized` into `gallery_localized`.
--
--   - Globally-unique ids: the old `(gallery_id, id)` PK on
--     saved_filter allowed the same filter id across different source
--     galleries. The new shape requires a globally unique id (it's a
--     gallery id now). If duplicates exist in the wild, this migration
--     fails at the INSERT INTO gallery step on the duplicate row —
--     surface that loudly rather than silently renaming.
--
-- After the move both old tables are dropped.

-- Type enum: column-level CHECK enforces the allowed set without a
-- separate trigger / index. DEFAULT 'real' so the ALTER works against
-- existing rows.
ALTER TABLE gallery ADD COLUMN type TEXT NOT NULL DEFAULT 'real'
  CHECK (type IN ('real', 'hybrid', 'saved_filter'));

UPDATE gallery SET type = 'hybrid'
WHERE id IN (SELECT DISTINCT gallery_id FROM virtual_gallery_source);

CREATE TABLE gallery_saved_filter (
  gallery_id        TEXT PRIMARY KEY REFERENCES gallery(id) ON DELETE CASCADE,
  source_gallery_id TEXT NOT NULL REFERENCES gallery(id),
  definition        TEXT NOT NULL
);

-- Promote each saved_filter into a gallery row. default_language is
-- inherited from the source so the canonical title/description sit in
-- the same language as the source.
INSERT INTO gallery (id, title, description, default_language, type)
SELECT
  sf.id,
  sf.title,
  sf.description,
  g.default_language,
  'saved_filter'
FROM saved_filter sf
JOIN gallery g ON g.id = sf.gallery_id;

INSERT INTO gallery_saved_filter (gallery_id, source_gallery_id, definition)
SELECT id, gallery_id, definition FROM saved_filter;

INSERT INTO gallery_localized (gallery_id, lang, title, description)
SELECT filter_id, lang, title, description FROM saved_filter_localized;

DROP TABLE saved_filter_localized;
DROP TABLE saved_filter;

UPDATE meta SET value='24' WHERE key='schema_version';
