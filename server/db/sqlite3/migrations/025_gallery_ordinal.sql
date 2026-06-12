-- Operator-curated gallery sort order (#585).
--
-- `gallery.id ASC` was the implicit sort everywhere — fine when ids
-- are slug-shaped and roughly chronological, but the operator wants
-- to override for the public picker / title-bar selector / admin
-- list. New `ordinal` column drives the primary sort; id stays as
-- the tiebreak so untouched galleries (all ordinal 0) preserve
-- today's order exactly.
--
-- Bare `ALTER TABLE ADD COLUMN ... DEFAULT 0` is fine on existing
-- rows; nothing here needs `gallery_new` rebuild dance.

ALTER TABLE gallery ADD COLUMN ordinal INTEGER NOT NULL DEFAULT 0;

UPDATE meta SET value='25' WHERE key='schema_version';
