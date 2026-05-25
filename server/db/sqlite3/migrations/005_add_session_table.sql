-- Refresh-token sessions. Each row is one logged-in device. The bearer JWT
-- becomes a short-lived access token (verified statelessly against the
-- user's secret); the row's `refresh_token_hash` is what `/tokens/refresh`
-- validates to mint a new access token. Deleting the row revokes that
-- specific session — `DELETE /api/v1/tokens` on logout.
--
-- `id` is the public session identifier sent to the client as the first
-- half of the combined refresh token (`<id>.<secret>`). `refresh_token_hash`
-- is the bcrypt hash of the second half — the secret. Lookup by `id`,
-- verify the secret with bcrypt, same shape as `user.password` checking.
--
-- `last_used_at` updates on every successful refresh, so sliding sessions
-- expire after CONST.SESSION_LENGTH_MS of inactivity rather than from a
-- fixed `created_at` cap.
--
-- ON DELETE CASCADE so removing a user (admin or `bin/user.ts delete`)
-- also clears their sessions without a follow-up sweep.

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX session_user_id_idx ON session(user_id);

UPDATE meta SET value='5' WHERE key='schema_version';
