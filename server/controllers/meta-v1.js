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

const cleanMeta = (meta) => {
  return Object.keys(meta)
    .filter((key) => key.startsWith("instance_"))
    .reduce((obj, key) => {
      return {
        ...obj,
        [key.replace("instance_", "")]: meta[key],
      };
    }, undefined);
};

/**
 * Get all meta.
 */
router.get("/", async (request, response) => {
  // Public, no authorization needed
  const meta = await model.getMetas();
  response.json(cleanMeta(meta));
//   response.json(meta.map(cleanMeta));
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
