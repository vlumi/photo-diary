-- Saved filters / sub-galleries on a single source gallery (#285).
-- A saved filter is a named, persisted (filter + dateRange) pair
-- attached to one real gallery. The frontend renders it as a sub-
-- entry under the gallery in the title-bar selector; the operator
-- shares stable URLs (`/g/<gallery>/f/<filter-id>`) that survive
-- session reloads — the public viewer applies the stored
-- definition to the existing `/query`, `/counts`, `/neighbors`
-- endpoints as if the operator had typed the filter pills.
--
-- Differs from virtual galleries (#22, migration 020): single
-- source gallery rather than a union; inherits the source's ACL
-- rather than carrying its own; storage is a JSON `definition`
-- blob rather than a relational source list. `definition` carries
-- whatever the per-view endpoints accept today: `filter`
-- (FilterShape) and `dateRange` (#264). Future filter shapes
-- (numeric ranges, place-radius, etc.) extend the JSON without
-- another migration.
--
-- `ordinal` preserves the operator's chosen display order in the
-- sub-entry selector; no semantic meaning beyond that.

CREATE TABLE saved_filter (
  id          TEXT NOT NULL,
  gallery_id  TEXT NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  definition  TEXT NOT NULL,
  ordinal     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gallery_id, id)
);

UPDATE meta SET value='23' WHERE key='schema_version';
