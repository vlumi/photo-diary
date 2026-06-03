-- Capture the EXIF blob read at intake on the photo row so the admin
-- UI can revert per-field overrides to the original camera value.
-- TEXT column holds the JSON-stringified output of
-- `converter/extract-properties/read-exif`. Historical rows leave it
-- NULL — the drawer's "revert to EXIF" affordance hides for those,
-- and editing EXIF-derived fields requires the operator to unlock
-- with an explicit "no backup" acknowledgement.

ALTER TABLE photo ADD COLUMN exif_at_intake TEXT;

UPDATE meta SET value='14' WHERE key='schema_version';
