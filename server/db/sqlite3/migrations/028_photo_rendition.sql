-- Per-photo rendition list. Each row says "this photo has a
-- rendition of size <max_dim> under the directory named <name>"
-- (the file lives at `photos/<name>/<photo_id>`). Going forward,
-- the converter writes one row per output it produces; an
-- operator can also rsync extra renditions onto the server and
-- register them via `bin/photo-rerender.ts` (#617).
--
-- The SPA reads the list per photo and builds an `<img srcset>`
-- from whatever's present — no hardcoded ladder. Aspect is
-- shared with the photo's `orig_*` dimensions (sharp's downscale
-- preserves it), so we don't store per-rendition width/height;
-- only the bounding-square edge (`max_dim`) the operator picked.
--
-- Thumbnails stay separate (`thumb_*` columns on `photo`,
-- cropped non-square, rendered at native size).
--
-- Backfill: every existing photo gets a `display`@1500 row so
-- the upgrade is invisible — `photo_rendition` immediately
-- describes today's on-disk state without anyone running a
-- script.

CREATE TABLE photo_rendition (
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_dim INTEGER NOT NULL,
  PRIMARY KEY (photo_id, name)
);

INSERT INTO photo_rendition (photo_id, name, max_dim)
  SELECT id, 'display', 1500 FROM photo;

UPDATE meta SET value='28' WHERE key='schema_version';
