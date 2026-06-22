-- One-shot dedup table for SSO tokens consumed across the cross-host
-- switch flow (#664). Each issued SSO token carries a UUID jti and a
-- short TTL (~30s); the target host inserts the jti here on first
-- consumption so replay attempts fail. Rows are pruned on each insert
-- to keep the table bounded even on busy installs.

CREATE TABLE sso_consumed_token (
  jti          TEXT PRIMARY KEY,
  consumed_at  INTEGER NOT NULL
);
CREATE INDEX sso_consumed_token_consumed_at_idx
  ON sso_consumed_token (consumed_at);

UPDATE meta SET value='31' WHERE key='schema_version';
