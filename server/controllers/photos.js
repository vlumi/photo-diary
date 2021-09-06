import express from "express";

import authorizerClass from "../lib/authorizer.js";
import modelClass from "../models/photo.js";

const router = express.Router();

const authorizer = authorizerClass();
const model = modelClass();

const init = async () => {
  await model.init();
};

export default {
  init,
  router,
};

/**
 * Get all photos.
 */
router.get("/", async (request, response) => {
  await authorizer.authorizeView(request.user.id);
  const photos = await model.getPhotos();
  response.json(photos);
});
/**
 * Create a photo.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const photo = {};
  // TODO: validate and set content from request.body
  const createdPhoto = await model.createPhoto(photo);
  response.json(createdPhoto);
});
/**
 * Get the matching photo.
 */
router.get("/:photoId", async (request, response) => {
  await authorizer.authorizeView(request.user.id);
  const photo = await model.getPhoto(request.params.photoId);
  response.json(photo);
});
/**
 * Update the matching photo.
 */
router.put("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const photo = {};
  // TODO: validate and set content from request.body
  const updatedPhoto = await model.updatePhoto(photo);
  response.json(updatedPhoto);
});
/**
 * Delete the matching photo.
 */
router.delete("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  await model.deletePhoto(request.params.photoId);
  response.status(204).end();
});
