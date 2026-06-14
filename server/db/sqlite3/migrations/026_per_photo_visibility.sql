-- Per-photo visibility. Adds an `is_private` flag to `photo` (the
-- private state lives on the photo, not the gallery link — a photo
-- is "private content" globally, irrespective of which gallery
-- it's in) and a matching `can_see_private` predicate on the
-- per-grant rows. Default-off so existing data behaves exactly as
-- before.
--
-- Resolution: a viewer sees a private photo iff they're global
-- admin, gallery-editor on at least one of the photo's galleries,
-- or hold a `user_gallery` / `group_gallery` / `:guest` row with
-- `can_see_private = 1` on the gallery they're viewing. Otherwise
-- the row drops out of every read path (list, query, counts,
-- neighbors, filter-values, stats, evolution) the same way a
-- missing grant does.
--
-- A gallery-specific `can_see_private` grant exposes the photo
-- only in that gallery's view; a viewer with view-only access in
-- another gallery the same photo lives in still won't see it
-- through that gallery.

ALTER TABLE photo ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_gallery ADD COLUMN can_see_private INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "group_gallery" ADD COLUMN can_see_private INTEGER NOT NULL DEFAULT 0;

UPDATE meta SET value='26' WHERE key='schema_version';
