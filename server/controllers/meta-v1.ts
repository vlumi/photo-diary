import type { FastifyPluginAsync } from "fastify";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/meta.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

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

const plugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all meta.
   */
  fastify.get("/", async () => {
    // Public, no authorization needed
    const meta = await model.getMetas();
    return { ...cleanMeta(meta), ...envDefaults() };
  });

  /**
   * Create a meta.
   */
  fastify.post("/", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const meta = {};
    // TODO: validate and set content from request.body
    return await model.createMeta(meta);
  });

  /**
   * Get the matching meta.
   */
  fastify.get<{ Params: { key: string } }>("/:key", async (request) => {
    // Public, no authorization needed
    const meta = await model.getMeta(`instance_${request.params.key}`);
    return cleanMeta(meta);
  });

  /**
   * Update the matching meta.
   */
  fastify.put<{ Params: { key: string } }>("/:key", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const meta = {};
    // TODO: validate and set content from request.body
    return await model.updateMeta(meta);
  });

  /**
   * Delete the matching meta.
   */
  fastify.delete<{ Params: { key: string } }>(
    "/:key",
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deleteMeta(request.params.key);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
