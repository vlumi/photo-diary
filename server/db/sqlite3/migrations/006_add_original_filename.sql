-- `original_filename` records the basename the photo arrived with (pre any
-- rename-on-import the converter does). Today id == originalFilename for
-- every row, so the backfill is trivial; #272's stable-ID rename makes them
-- diverge going forward, at which point the operator's enrichment JSONs
-- (and `bin/photo.ts search`) can still find rows via the human-recognised
-- camera filename.

ALTER TABLE photo ADD COLUMN original_filename TEXT;
UPDATE photo SET original_filename = id;

UPDATE meta SET value='6' WHERE key='schema_version';
