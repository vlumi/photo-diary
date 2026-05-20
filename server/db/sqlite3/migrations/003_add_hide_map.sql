-- Privacy toggle: hide map and photo coordinates.
--
-- A single `hide_map` column on `acl` covers every level of the cascade via
-- the existing `:guest` user and `:all` gallery sentinels:
--   - (user_id,    gallery_id)  — per-user, per-gallery (most specific)
--   - (':guest',   gallery_id)  — per-gallery default
--   - (user_id,    ':all')      — per-user default
--   - (':guest',   ':all')      — global default
--
-- For a given request, the most specific row with a non-null `hide_map`
-- wins. If no row matches, coordinates are shown (default false). Stored
-- as INTEGER: 1 = hide, 0 = show, NULL = no opinion at that level.

ALTER TABLE acl ADD COLUMN hide_map INTEGER;

UPDATE meta SET value = '3' WHERE key = 'schema_version';
