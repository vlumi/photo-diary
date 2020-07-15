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
 * Get the properties of all photos.
 */
router.get("/", async (request, response) => {
  await authorizer.authorizeView(request.session.username);
  const photos = await photosModel.getAllPhotos();
  response.json(photos);
});
/**
 * Create the properties of a photo.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.session.username);
  const photo = {};
  // TODO: validate and set content from request.body
  const createdPhoto = await photosModel.createPhoto(photo);
  response.json(createdPhoto);
});
/**
 * Get the properties of a photo.
 */
router.get("/:photoId", async (request, response) => {
  await authorizer.authorizeView(request.session.username);
  const photo = await photosModel.getPhoto(request.params.photoId);
  response.json(photo);
});
/**
 * Update the properties of a photo.
 */
router.put("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.session.username);
  const photo = {};
  // TODO: validate and set content from request.body
  const updatedPhoto = await photosModel.updatePhoto(photo);
  response.json(updatedPhoto);
});
/**
 * Delete the properties of a photo.
 */
router.delete("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.session.username);
  await photosModel.deletePhoto(request.params.galleryId);
  response.status(204).end();
});
