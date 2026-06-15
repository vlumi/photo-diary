-- Collapse `photo_rendition` onto `(photo_id, max_dim)`. The `name`
-- column was the directory under `photos/<name>/<id>.jpg`; every
-- existing row has `name='display'` (the #615 rollout only ever shipped
-- the default ladder), so the namespace is fixed to `display/` and the
-- size becomes the only discriminator. On-disk layout moves from
-- `photos/display/<id>.jpg` to `photos/display/<max_dim>/<id>.jpg`;
-- the operator runs the corresponding `mkdir` + `mv` from the
-- CHANGELOG note before restarting the server.
--
-- `gallery.icon_source` JSON also loses its directory dimension —
-- the (only) existing crops were taken against `display/<id>` which
-- becomes `display/1500/<id>`, so we add `sourceMaxDim: 1500` to
-- every row that has a saved crop.

CREATE TABLE photo_rendition_new (
  photo_id TEXT NOT NULL REFERENCES photo(id) ON DELETE CASCADE,
  max_dim INTEGER NOT NULL,
  PRIMARY KEY (photo_id, max_dim)
);
INSERT INTO photo_rendition_new (photo_id, max_dim)
  SELECT photo_id, max_dim FROM photo_rendition;
DROP TABLE photo_rendition;
ALTER TABLE photo_rendition_new RENAME TO photo_rendition;

UPDATE gallery
   SET icon_source = json_set(icon_source, '$.sourceMaxDim', 1500)
 WHERE icon_source IS NOT NULL
   AND json_extract(icon_source, '$.sourceMaxDim') IS NULL;

-- Seed `instance_renditions` so the admin UI reflects the actual
-- stored value at all times. Without this row the converter falls
-- back to its hardcoded default, but the UI then shows `1500` for a
-- value that doesn't yet exist in the DB — confusing on the first
-- edit, since adding a second size would suddenly write both.
INSERT OR IGNORE INTO meta (key, value) VALUES ('instance_renditions', '[1500]');

UPDATE meta SET value='29' WHERE key='schema_version';
