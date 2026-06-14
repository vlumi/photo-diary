import db from "photo-diary-server/db/index.js";

import { DEFAULT_RENDITIONS } from "./constants.js";
import * as logger from "./logger.js";

const isValidMaxDim = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value > 0;

// Fall back to DEFAULT_RENDITIONS on any failure path so a typo in
// the admin UI doesn't halt the converter.
export const loadRenditions = async (): Promise<number[]> => {
  const metas = await db.loadMetas();
  const raw = metas["instance_renditions"];
  if (typeof raw !== "string" || raw.length === 0) return DEFAULT_RENDITIONS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.error(
      "instance_renditions meta is not valid JSON; falling back to default ladder"
    );
    return DEFAULT_RENDITIONS;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_RENDITIONS;
  const valid = parsed.filter(isValidMaxDim);
  if (valid.length === 0) {
    logger.error(
      "instance_renditions meta has no valid entries; falling back to default ladder"
    );
    return DEFAULT_RENDITIONS;
  }
  return valid;
};
