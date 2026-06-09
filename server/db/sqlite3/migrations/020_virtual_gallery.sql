-- Virtual galleries: a gallery whose contents are the union of one
-- or more real galleries' photos, resolved live at read time (no
-- materialised gallery_photo rows, no cache). The composition is a
-- JSON array of source gallery IDs — JSON keeps the structure
-- forward-compatible if more options (ordering, exclusions) land
-- later. Same first-class-gallery shape otherwise: own ACL, own
-- title, own theme via the `gallery` row.
--
-- Constraint enforced in code, not SQL: sources may only point at
-- real (non-virtual) galleries — composition of virtual galleries
-- sidesteps cycle detection and depth limits. Can be relaxed later
-- if it ever turns out to matter. (#22)

CREATE TABLE virtual_gallery (
  gallery_id TEXT PRIMARY KEY REFERENCES gallery(id) ON DELETE CASCADE,
  sources TEXT NOT NULL
);

UPDATE meta SET value='20' WHERE key='schema_version';
