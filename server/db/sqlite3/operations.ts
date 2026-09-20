import { db } from "./connection.js";

// Operation event log — append-only stream of converter / operator-
// script actions. Powers the Manage operations panel ("what just
// happened? what's pending? what failed?").
export interface OperationEvent {
  id: number;
  createdAt: string;
  photoId: string | null;
  action: string;
  status: "success" | "failure" | "skipped";
  detail: string | null;
}

export interface OperationEventRow {
  id: number;
  created_at: string;
  photo_id: string | null;
  action: string;
  status: string;
  detail: string | null;
}
export const mapOperationEvent = (row: OperationEventRow): OperationEvent => ({
  id: row.id,
  createdAt: row.created_at,
  photoId: row.photo_id,
  action: row.action,
  status: row.status as OperationEvent["status"],
  detail: row.detail,
});

export const logOperation = async (event: {
  photoId?: string | null;
  action: string;
  status: OperationEvent["status"];
  detail?: string | null;
}): Promise<void> => {
  db.prepare(
    `INSERT INTO operation_event (created_at, photo_id, action, status, detail)
       VALUES (?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    event.photoId ?? null,
    event.action,
    event.status,
    event.detail ?? null
  );
};

export const loadRecentOperations = async (limit = 100): Promise<OperationEvent[]> => {
  const rows = db
    .prepare(
      `SELECT id, created_at, photo_id, action, status, detail
         FROM operation_event
        ORDER BY id DESC
        LIMIT ?`
    )
    .all(limit) as OperationEventRow[];
  return rows.map(mapOperationEvent);
};

export const loadOperationFailures = async (
  limit = 50
): Promise<OperationEvent[]> => {
  const rows = db
    .prepare(
      `SELECT id, created_at, photo_id, action, status, detail
         FROM operation_event
        WHERE status = 'failure'
        ORDER BY id DESC
        LIMIT ?`
    )
    .all(limit) as OperationEventRow[];
  return rows.map(mapOperationEvent);
};

// Trim operation_event rows older than `cutoffIso`. Index on
// created_at keeps this a fast range delete even on growing tables.
export const pruneOperationsBefore = async (cutoffIso: string): Promise<number> => {
  const result = db
    .prepare("DELETE FROM operation_event WHERE created_at < ?")
    .run(cutoffIso);
  return result.changes;
};

// Atomic "consume this SSO jti or fail if already consumed". Single
// INSERT against a PRIMARY KEY — concurrent calls with the same jti
// resolve to exactly one success + the rest throwing. Better-sqlite3
// surfaces UNIQUE-constraint violations as SqliteError with
// code === "SQLITE_CONSTRAINT_PRIMARYKEY"; the caller maps that to a
// 401 (replay). Returns true if this call won the consume race,
// false if it lost (the jti was already in the table).
export const consumeSsoJti = async (
  jti: string,
  nowEpochMs: number,
  ttlMs: number
): Promise<boolean> => {
  // Opportunistically prune expired rows on every consume — single
  // indexed range delete, cheap. Keeps the table from growing
  // unbounded without a separate sweeper.
  db.prepare("DELETE FROM sso_consumed_token WHERE consumed_at < ?").run(
    nowEpochMs - ttlMs
  );
  try {
    db.prepare(
      "INSERT INTO sso_consumed_token (jti, consumed_at) VALUES (?, ?)"
    ).run(jti, nowEpochMs);
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "SQLITE_CONSTRAINT_PRIMARYKEY") return false;
    throw err;
  }
};

// Pending = photos with coords that haven't been geocoded yet and
// aren't flagged geocode_no_data. Mirrors the daemon's own
// loadPhotosMissingGeocoded query for the en branch.
export const countPendingGeocode = async (): Promise<number> => {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM photo
        WHERE coord_lat IS NOT NULL AND coord_lon IS NOT NULL
          AND geocoded_city IS NULL
          AND geocode_no_data = 0`
    )
    .get() as { n: number };
  return row.n;
};
