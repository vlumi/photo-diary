-- Backfill `gallery.icon_source.sourceName` to "display".
--
-- Up to this migration the cropper hard-coded `display/<id>` as the
-- source; the JSON blob in `icon_source` only carried `{photoId,
-- crop}`. From this version on, the cropper picks the rendition (the
-- largest the photo has) and the server requires `sourceName` in the
-- payload so its crop pixel space matches the UI's. Existing rows
-- need the field filled in or the next re-crop fails server-side
-- validation; "display" is the right value because every existing
-- crop *was* taken against `display/<id>`.
--
-- SQLite's json_set is available since 3.18; we're on 3.45+.
UPDATE gallery
   SET icon_source = json_set(icon_source, '$.sourceName', 'display')
 WHERE icon_source IS NOT NULL
   AND json_extract(icon_source, '$.sourceName') IS NULL;

UPDATE meta SET value='29' WHERE key='schema_version';
