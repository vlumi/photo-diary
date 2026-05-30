-- Drop the now-dead Nominatim columns. After the state-level beta
-- (PR #367), state names are derived from `geocoded_state_code` via
-- curated subdivision JSON files — Nominatim's localized `state` is
-- no longer read. `geocoded_district` was never displayed. The hand-
-- assembled City + State + Country address line replaced `geocoded_
-- place` (Nominatim's `display_name`).
--
-- Indexes on `geocoded_state` / `geocoded_district` must go first;
-- SQLite refuses DROP COLUMN on an indexed column.

DROP INDEX IF EXISTS photo_geocoded_state_idx;
DROP INDEX IF EXISTS photo_geocoded_district_idx;

ALTER TABLE photo DROP COLUMN geocoded_state;
ALTER TABLE photo DROP COLUMN geocoded_district;
ALTER TABLE photo DROP COLUMN geocoded_place;

ALTER TABLE photo_localized DROP COLUMN geocoded_state;
ALTER TABLE photo_localized DROP COLUMN geocoded_district;
ALTER TABLE photo_localized DROP COLUMN geocoded_place;

UPDATE meta SET value='9' WHERE key='schema_version';
