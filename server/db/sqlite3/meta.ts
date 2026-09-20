import { NotFoundError } from "../../lib/errors.js";
import { type MetaRow } from "./schema.js";
import { SCHEMA, db, deleteById } from "./connection.js";

export const loadMetas = async () => {
  const rows = db.prepare(SCHEMA.meta.buildSelectQuery()).all() as MetaRow[];
  return rows.map(SCHEMA.meta.mapRow);
};
export const createMeta = async (meta: { key: string; value: string }) => {
  db.prepare(SCHEMA.meta.buildCreateQuery()).run(SCHEMA.meta.mapInsert(meta));
};
export const loadMeta = async (key: string) => {
  const row = db.prepare(SCHEMA.meta.buildSelectByIdQuery()).get(key) as
    | MetaRow
    | undefined;
  if (!row) throw new NotFoundError();
  return SCHEMA.meta.mapRow(row);
};
export const updateMeta = async (key: string, meta: Partial<MetaRow>) => {
  const { query, values } = SCHEMA.meta.buildUpdateByIdQuery(meta);
  if (!query || !values) return;
  db.prepare(query).run([...values, key]);
};
export const deleteMeta = async (key: string) => deleteById(SCHEMA.meta, key);
