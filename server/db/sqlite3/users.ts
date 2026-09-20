import { NotFoundError } from "../../lib/errors.js";
import { type SessionRow, type User, type UserRow } from "./schema.js";
import { SCHEMA, db, deleteById } from "./connection.js";

export const loadUsers = async () => {
  const rows = db.prepare(SCHEMA.user.buildSelectQuery()).all() as UserRow[];
  return rows.map(SCHEMA.user.mapRow);
};
export const createUser = async (user: User) => {
  db.prepare(SCHEMA.user.buildCreateQuery()).run(SCHEMA.user.mapInsert(user));
};
export const loadUser = async (userId: string) => {
  const row = db.prepare(SCHEMA.user.buildSelectByIdQuery()).get(userId) as
    | UserRow
    | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.user.mapRow(row);
};
export const updateUser = async (userId: string, user: Partial<User>) => {
  const { query, values } = SCHEMA.user.buildUpdateByIdQuery(user);
  if (!query || !values) return;
  db.prepare(query).run([...values, userId]);
};
export const deleteUser = async (userId: string) => deleteById(SCHEMA.user, userId);

export const createSession = async (session: SessionRow): Promise<void> => {
  db.prepare(SCHEMA.session.buildCreateQuery()).run(
    SCHEMA.session.mapInsert(session)
  );
};
export const loadSession = async (
  sessionId: string
): Promise<SessionRow | undefined> => {
  const row = db
    .prepare(SCHEMA.session.buildSelectByIdQuery())
    .get(sessionId) as SessionRow | undefined;
  return row ? SCHEMA.session.mapRow(row) : undefined;
};
export const updateSession = async (
  sessionId: string,
  patch: Partial<SessionRow>
): Promise<void> => {
  const { query, values } = SCHEMA.session.buildUpdateByIdQuery(patch);
  if (!query || !values) return;
  db.prepare(query).run([...values, sessionId]);
};
// Atomic check-and-swap for the refresh-token rotation. Returns true
// if exactly one row was updated — meaning we are the winning caller
// in a concurrent-refresh race. Returns false if 0 rows matched —
// some other request already rotated the same session (the WHERE
// clause's `refresh_token_hash = ?` no longer matches). The caller
// throws InvalidTokenError in that case; the client's cross-tab
// retry path picks up the winner's fresh cookies from the shared
// jar and re-issues the original request.
export const rotateSessionHash = async (
  sessionId: string,
  expectedHash: string,
  newHash: string,
  lastUsedAt: number
): Promise<boolean> => {
  const info = db
    .prepare(
      "UPDATE session SET refresh_token_hash = ?, last_used_at = ? " +
        "WHERE id = ? AND refresh_token_hash = ?"
    )
    .run(newHash, lastUsedAt, sessionId, expectedHash);
  return info.changes === 1;
};
export const deleteSession = async (sessionId: string): Promise<void> =>
  deleteById(SCHEMA.session, sessionId);
// Used by the admin all-sessions revoke and the cascade from
// `bin/user.ts passwd` / secret rotation paths that want a clean slate.
export const deleteUserSessions = async (userId: string): Promise<void> => {
  db.prepare("DELETE FROM session WHERE user_id = ?").run(userId);
};
