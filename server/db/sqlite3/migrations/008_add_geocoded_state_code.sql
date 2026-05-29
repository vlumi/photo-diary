-- ISO 3166-2 subdivision code (e.g. JP-13, US-MA) from Nominatim's
-- `ISO3166-2-lvl4` address field. Language-independent, so a single
-- column on `photo` is enough (no localized variant).
--
-- Used as a fallback disambiguator for cities with the same name across
-- subdivisions (Springfield IL vs MO, Cambridge UK vs MA) when the
-- localized `geocoded_state` is empty (Tokyo returns no state name but
-- does return ISO3166-2-lvl4="JP-13").

ALTER TABLE photo ADD COLUMN geocoded_state_code TEXT;

CREATE INDEX photo_geocoded_state_code_idx ON photo (geocoded_state_code);

-- Backfill from the raw Nominatim address JSON we already stored in
-- 007. `ISO3166-2-lvl4` is the field name; the hyphen requires JSON
-- path quoting. Rows whose address blob is missing the field stay NULL.
UPDATE photo
SET geocoded_state_code =
    json_extract(geocoded_address, '$."ISO3166-2-lvl4"')
WHERE geocoded_address IS NOT NULL
  AND json_valid(geocoded_address)
  AND json_extract(geocoded_address, '$."ISO3166-2-lvl4"') IS NOT NULL;

UPDATE meta SET value='8' WHERE key='schema_version';
