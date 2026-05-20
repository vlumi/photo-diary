import express from "express";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/meta.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};
const router = express.Router();

export default { init, router };

const cleanMeta = (meta: Record<string, unknown>): Record<string, unknown> => {
  return Object.keys(meta)
    .filter((key) => key.startsWith("instance_"))
    .reduce<Record<string, unknown>>((obj, key) => {
      return {
        ...obj,
        [key.replace("instance_", "")]: meta[key],
      };
    }, {});
};

// Per-instance frontend defaults pulled from the server's `process.env`.
// Each one is optional — the frontend falls back to its hardcoded default in
// `lib/config.ts` when the key is absent. Edit the per-instance `.env` file
// to set these (e.g. `DEFAULT_GALLERY=dailybw`).
const envDefaults = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const { DEFAULT_GALLERY, DEFAULT_THEME, INITIAL_GALLERY_VIEW, FIRST_WEEKDAY } =
    process.env;
  if (DEFAULT_GALLERY) out.defaultGallery = DEFAULT_GALLERY;
  if (DEFAULT_THEME) out.defaultTheme = DEFAULT_THEME;
  if (INITIAL_GALLERY_VIEW) out.initialGalleryView = INITIAL_GALLERY_VIEW;
  if (FIRST_WEEKDAY) out.firstWeekday = FIRST_WEEKDAY;
  return out;
};

/**
 * Get all meta.
 */
router.get("/", async (request, response) => {
  // Public, no authorization needed
  const meta = await model.getMetas();
  response.json({ ...cleanMeta(meta), ...envDefaults() });
});
/**
 * Create a meta.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const meta = {};
  // TODO: validate and set content from request.body
  const createdMeta = await model.createMeta(meta);
  response.json(createdMeta);
});
/**
 * Get the matching meta.
 */
router.get("/:key", async (request, response) => {
  // Public, no authorization needed
  const meta = await model.getMeta(`instance_${request.params.key}`);
  response.json(cleanMeta(meta));
});
/**
 * Update the matching meta.
 */
router.put("/:key", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const meta = {};
  // TODO: validate and set content from request.body
  const updatedMeta = await model.updateMeta(meta);
  response.json(updatedMeta);
});
/**
 * Delete the matching meta.
 */
router.delete("/:key", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  await model.deleteMeta(request.params.key);
  response.status(204).end();
});
