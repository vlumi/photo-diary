-- Fix the long-standing FK typo in `gallery_photo`. The baseline migration
-- declared `FOREIGN KEY(photo_id) REFERENCES photos(id)` and
-- `FOREIGN KEY(gallery_id) REFERENCES galleries(id)` (plural) — but the
-- actual tables are `photo` and `gallery`. better-sqlite3 turns on
-- `PRAGMA foreign_keys = ON` by default, so every mutation on the table
-- failed with `no such table: main.galleries` once the better-sqlite3
-- migration shipped in 0.6.0.
--
-- Rebuild the table with the correct references. The runner wraps this in
-- `PRAGMA foreign_keys = OFF; BEGIN; ...; COMMIT; PRAGMA foreign_key_check;
-- PRAGMA foreign_keys = ON;` so the rebuild itself doesn't trip an integrity
-- check during the swap.

CREATE TABLE gallery_photo_new (
  gallery_id TEXT,
  photo_id TEXT,
  PRIMARY KEY(photo_id, gallery_id),
  FOREIGN KEY(photo_id)   REFERENCES photo(id),
  FOREIGN KEY(gallery_id) REFERENCES gallery(id)
);
INSERT INTO gallery_photo_new SELECT * FROM gallery_photo;
DROP TABLE gallery_photo;
ALTER TABLE gallery_photo_new RENAME TO gallery_photo;

UPDATE meta SET value = '2' WHERE key = 'schema_version';
