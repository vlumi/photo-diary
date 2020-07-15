const authorizer = require("../utils/authorizer")();
const photosModel = require("../models/photos")();

const init = async () => {
  await photosModel.init();
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
  const photos = await photosModel.getAllPhotos();
  response.json(photos);
});
/**
 * Create a photo.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const photo = {};
  // TODO: validate and set content from request.body
  const createdPhoto = await photosModel.createPhoto(photo);
  response.json(createdPhoto);
});
/**
 * Get the matching photo.
 */
router.get("/:photoId", async (request, response) => {
  await authorizer.authorizeView(request.user.username);
  const photo = await photosModel.getPhoto(request.params.photoId);
  response.json(photo);
});
/**
 * Update the matching photo.
 */
router.put("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const photo = {};
  // TODO: validate and set content from request.body
  const updatedPhoto = await photosModel.updatePhoto(photo);
  response.json(updatedPhoto);
});
/**
 * Delete the matching photo.
 */
router.delete("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  await photosModel.deletePhoto(request.params.photoId);
  response.status(204).end();
});
