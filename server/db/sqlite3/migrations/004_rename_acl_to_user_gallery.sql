-- Rename `acl` → `user_gallery` and `level` → `access_level`.
--
-- The table grew beyond pure access control with migration 003 (hide_map for
-- the privacy cascade), and more per-pair preferences are likely. Its real
-- shape is "for this (user, gallery) cell, what's true about that pair" — the
-- `user_gallery` name matches that intent and pairs nicely with the existing
-- `gallery_photo` link table. `access_level` makes the column's semantics
-- explicit too: the integer is the level *of access*, not a generic level
-- (which would read oddly next to a `hide_map` privacy column).
--
-- Both ALTERs are SQLite-native (no table rebuild needed).

ALTER TABLE acl RENAME TO user_gallery;
ALTER TABLE user_gallery RENAME COLUMN level TO access_level;

UPDATE meta SET value='4' WHERE key='schema_version';
