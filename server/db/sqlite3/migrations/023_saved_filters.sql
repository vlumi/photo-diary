-- Saved filters / sub-galleries on a single source gallery (#285).
-- A saved filter is a named, persisted (filter + dateRange) pair
-- attached to one real gallery — to normal users it reads as a
-- regular gallery (title, description, with per-language overlays
-- matching `gallery_localized`'s shape from migrations 021 + 022).
-- The frontend renders saved filters as sub-entries under their
-- source gallery in the title-bar selector; the operator shares
-- stable URLs (`/g/<gallery>/f/<filter-id>`) that survive session
-- reloads, and the public viewer applies the stored definition to
-- the existing `/query` / `/counts` / `/neighbors` endpoints as if
-- the operator had typed the filter pills.
--
-- Differs from virtual galleries (#22, migration 020): single
-- source gallery rather than a union; inherits the source's ACL
-- rather than carrying its own; inherits the source's
-- `default_language` for the canonical title / description;
-- storage is a JSON `definition` blob rather than a relational
-- source list. `definition` carries whatever the per-view
-- endpoints accept today: `filter` (FilterShape) and `dateRange`
-- (#264). Future filter shapes extend the JSON without another
-- migration.
--
-- `saved_filter_localized` mirrors `gallery_localized` — one row
-- per (gallery_id, filter_id, lang) pair with optional `title`
-- and `description` overlay columns. Composite FK to
-- `saved_filter(gallery_id, id)` so cascade-delete propagates
-- when a saved filter is removed or its source gallery is.

CREATE TABLE saved_filter (
  id          TEXT NOT NULL,
  gallery_id  TEXT NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  definition  TEXT NOT NULL,
  ordinal     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gallery_id, id)
);

CREATE TABLE saved_filter_localized (
  gallery_id  TEXT NOT NULL,
  filter_id   TEXT NOT NULL,
  lang        TEXT NOT NULL,
  title       TEXT,
  description TEXT,
  PRIMARY KEY (gallery_id, filter_id, lang),
  FOREIGN KEY (gallery_id, filter_id) REFERENCES saved_filter(gallery_id, id) ON DELETE CASCADE
);

UPDATE meta SET value='23' WHERE key='schema_version';
