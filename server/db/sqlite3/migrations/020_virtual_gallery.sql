-- Virtual galleries: a gallery whose contents are the union of one
-- or more real galleries' photos, resolved live at read time (no
-- materialised gallery_photo rows, no cache). Sources live in a
-- junction table so each (virtual, source) pair gets its own row —
-- per-source FKs catch dangling references at the DB level,
-- `JOIN` is natural for reads, and per-source attributes (weights,
-- exclusions, etc.) extend as plain columns rather than mutating a
-- JSON shape.
--
-- A gallery is virtual iff it has at least one row in this table.
-- ON DELETE CASCADE on both columns: deleting the virtual gallery
-- cleans up its source rows; deleting a source gallery narrows the
-- virtual (the "deleting a source shrinks it" line from #22).
-- `ordinal` preserves the operator's input order for display.
--
-- Constraint enforced in code, not SQL: sources may only point at
-- real (non-virtual) galleries — composition of virtual galleries
-- sidesteps cycle detection and depth limits. Can be relaxed later
-- if it ever turns out to matter. (#22)

CREATE TABLE virtual_gallery_source (
  gallery_id TEXT NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  PRIMARY KEY (gallery_id, source_id)
);

UPDATE meta SET value='20' WHERE key='schema_version';
