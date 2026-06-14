import db from "photo-diary-server/db/index.js";

import { DEFAULT_RENDITIONS, type Rendition } from "./constants.js";
import * as logger from "./logger.js";

const isValidRendition = (entry: unknown): entry is Rendition => {
  if (!entry || typeof entry !== "object") return false;
  const r = entry as Record<string, unknown>;
  return (
    typeof r.name === "string" &&
    r.name.length > 0 &&
    !r.name.includes("/") &&
    !r.name.includes("..") &&
    typeof r.maxDim === "number" &&
    Number.isFinite(r.maxDim) &&
    r.maxDim > 0
  );
};

export const loadRenditions = async (): Promise<Rendition[]> => {
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
  const valid = parsed.filter(isValidRendition);
  if (valid.length === 0) {
    logger.error(
      "instance_renditions meta has no valid entries; falling back to default ladder"
    );
    return DEFAULT_RENDITIONS;
  }
  return valid;
};
