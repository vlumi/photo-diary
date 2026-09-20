import Database from "better-sqlite3";
import config from "../../lib/config/index.js";
import logger from "../../lib/logger.js";
import { migrate } from "./migrate.js";
import schemaFactory from "./schema.js";

export const SCHEMA = schemaFactory();

if (!config.DB_OPTS) {
  throw "The path to the SQLite3 database must be set to DB_OPTS.";
}
export const db = new Database(config.DB_OPTS);
logger.debug("Connected to DB");
migrate(db);

export const deleteById = (
  schema: { buildDeleteByIdQuery: () => string },
  id: string
) => {
  db.prepare(schema.buildDeleteByIdQuery()).run([id]);
};

// Test-only seam. The :memory: connection persists for the life of
// the vitest worker (migrations already applied at module load), so
// rather than dropping + remigrating between tests we DELETE rows
// in FK-safe order and let the next `beforeEach` reseed. `:guest`
// stays — migration 015 seeds it idempotently and the access cascade
// depends on the row existing.
export const _resetForTests = (): void => {
  db.exec(`
    DELETE FROM photo_localized;
    DELETE FROM gallery_photo;
    DELETE FROM user_gallery;
    DELETE FROM group_gallery;
    DELETE FROM user_group;
    DELETE FROM session;
    DELETE FROM photo;
    DELETE FROM gallery;
    DELETE FROM "group";
    DELETE FROM user WHERE id != ':guest';
    DELETE FROM meta WHERE key != 'schema_version';
    DELETE FROM operation_event;
    DELETE FROM sso_consumed_token;
  `);
};
