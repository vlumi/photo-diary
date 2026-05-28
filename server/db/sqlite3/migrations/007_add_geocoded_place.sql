-- Reverse-geocoded place hierarchy, derived from the photo's coords via
-- Nominatim at intake (and via `bin/photo-geocode.ts` for backfill).
-- Additive to the existing `country_code` / `place` columns — those keep
-- their operator-set meaning (place can be "home" or any custom label;
-- country_code is operator-set with a default at insert time).
--
-- English is the canonical / filter-keyed language, stored directly on
-- the photo row so filter queries and the English read path don't need
-- a join. Other languages live in `photo_localized` — exists only when
-- actually translated, no `lang='en'` rows there.
--
-- `geocoded_address` keeps Nominatim's raw `address` object as JSON so
-- the field mapping (state ← state || province || region || ...) can
-- be revised without re-fetching.

ALTER TABLE photo ADD COLUMN geocoded_country_code TEXT;
ALTER TABLE photo ADD COLUMN geocoded_state TEXT;
ALTER TABLE photo ADD COLUMN geocoded_city TEXT;
ALTER TABLE photo ADD COLUMN geocoded_district TEXT;
ALTER TABLE photo ADD COLUMN geocoded_place TEXT;
ALTER TABLE photo ADD COLUMN geocoded_address TEXT;

CREATE INDEX photo_geocoded_country_idx  ON photo (geocoded_country_code);
CREATE INDEX photo_geocoded_state_idx    ON photo (geocoded_state);
CREATE INDEX photo_geocoded_city_idx     ON photo (geocoded_city);
CREATE INDEX photo_geocoded_district_idx ON photo (geocoded_district);

CREATE TABLE photo_localized (
  photo_id          TEXT NOT NULL,
  lang              TEXT NOT NULL,
  geocoded_state    TEXT,
  geocoded_city     TEXT,
  geocoded_district TEXT,
  geocoded_place    TEXT,
  geocoded_address  TEXT,
  PRIMARY KEY (photo_id, lang),
  FOREIGN KEY (photo_id) REFERENCES photo(id) ON DELETE CASCADE
);

UPDATE meta SET value='7' WHERE key='schema_version';
