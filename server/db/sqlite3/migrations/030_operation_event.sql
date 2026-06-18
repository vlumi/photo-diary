-- Append-only ring of converter / operator-script events: one row per
-- meaningful daemon step (intake, geocode, regeocode, …) so the admin
-- UI can answer "what did the worker do recently? what's failing?"
-- without forcing the operator to tail pm2 logs.
--
-- Storage shape decisions:
--   - Single flat table, no separate failure/success tables; status
--     column carries the distinction.
--   - photo_id NULL allowed — some events are about a queue stage,
--     not a specific photo. Today every emitter ties to a photo;
--     keeping the column nullable leaves room for queue-level rows
--     later without another migration.
--   - created_at as ISO 8601 text. SQLite's CURRENT_TIMESTAMP would
--     give us second resolution; the converter wants ms so emitters
--     pass `new Date().toISOString()` explicitly.
--   - No pruning in the schema. Read paths LIMIT; if a long-running
--     instance grows the table, the operator runs a manual DELETE.

CREATE TABLE operation_event (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL,
  photo_id   TEXT,
  action     TEXT    NOT NULL,
  status     TEXT    NOT NULL,
  detail     TEXT
);

CREATE INDEX operation_event_created_at_idx
  ON operation_event (created_at DESC);
CREATE INDEX operation_event_status_idx
  ON operation_event (status, created_at DESC);

UPDATE meta SET value='30' WHERE key='schema_version';
