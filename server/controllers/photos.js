const authorizer = require("../utils/authorizer")();
const model = require("../models/photo")();

const init = async () => {
  await model.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

/**
 * Get all photos.
 */
router.get("/", async (request, response) => {
  await authorizer.authorizeView(request.user.username);
  const photos = await model.getPhotos();
  response.json(photos);
});
/**
 * Create a photo.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const photo = {};
  // TODO: validate and set content from request.body
  const createdPhoto = await model.createPhoto(photo);
  response.json(createdPhoto);
});
/**
 * Get the matching photo.
 */
router.get("/:photoId", async (request, response) => {
  await authorizer.authorizeView(request.user.username);
  const photo = await model.getPhoto(request.params.photoId);
  response.json(photo);
});
/**
 * Update the matching photo.
 */
router.put("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const photo = {};
  // TODO: validate and set content from request.body
  const updatedPhoto = await model.updatePhoto(photo);
  response.json(updatedPhoto);
});
/**
 * Delete the matching photo.
 */
router.delete("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  await model.deletePhoto(request.params.photoId);
  response.status(204).end();
});
