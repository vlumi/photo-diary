-- Remember which photo the gallery icon was cropped from + the crop
-- rectangle, so the admin UI's cropper can re-open against the same
-- source and adjust without re-picking from scratch. JSON-stringified
-- `{ photoId, crop: { x, y, width, height } }`; null for icons set
-- before this column existed (typed paths via `bin/gallery.ts`) or
-- never set.

ALTER TABLE gallery ADD COLUMN icon_source TEXT;

UPDATE meta SET value='16' WHERE key='schema_version';
