-- The `:guest` pseudo-user backs the access cascade's "anyone
-- visiting" semantic: user_gallery rows with `user_id = ':guest'`
-- grant access to every anonymous viewer. Until now the row only
-- needed to exist in `user_gallery`; the `user` table didn't
-- necessarily carry a `:guest` row, so the admin Users list
-- silently omitted it on instances that never bootstrapped one.
--
-- Seed the row idempotently so `GET /api/v1/users` always
-- includes it, the /m/users page can surface it (with the
-- pseudo-user banner), and operators have one canonical place
-- to manage anonymous access. Password / secret stay empty —
-- the token endpoint already rejects `:`-prefixed logins so
-- this row can't authenticate regardless of column contents.

INSERT OR IGNORE INTO user (id, password, secret, is_admin)
VALUES (':guest', '', '', 0);

UPDATE meta SET value='15' WHERE key='schema_version';
