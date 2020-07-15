const authorizer = require("../utils/authorizer")();
const galleriesModel = require("../models/galleries")();

const init = async () => {
  await galleriesModel.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

/**
 * Get all galleries.
 */
router.get("/", async (request, response) => {
  const galleries = await galleriesModel.getGalleries();
  const galleryIds = galleries.map((gallery) => gallery.id);

  const authorizedPromises = await Promise.allSettled(
    galleryIds.map((galleryId) =>
      authorizer.authorizeGalleryView(request.user.username, galleryId)
    )
  );
  const authorizedGalleryIds = authorizedPromises
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const authorizedGalleries = galleries.filter((gallery) =>
    authorizedGalleryIds.includes(gallery.id)
  );
  response.json(authorizedGalleries);
});
/**
 * Create a new gallery.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.username);
  const gallery = {};
  // TODO: validate and set content from request.body
  const craetedGallery = await galleriesModel.createGallery(gallery);
  response.json(craetedGallery);
});
/**
 * Get a single gallery, including its photos.
 */
router.get("/:galleryId", async (request, response) => {
  await authorizer.authorizeGalleryView(
    request.user.username,
    request.params.galleryId
  );
  const gallery = await galleriesModel.getGallery(request.params.galleryId);
  response.json(gallery);
});
/**
 * Update gallery properties
 */
router.put("/:galleryId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.username,
    request.params.galleryId
  );
  const gallery = {};
  // TODO: validate and set content from request.body
  const updatedGallery = await galleriesModel.updateGallery(gallery);
  response.json(updatedGallery);
});
/**
 * Delete a gallery.
 */
router.delete("/:galleryId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.username,
    request.params.galleryId
  );
  await galleriesModel.deleteGallery(request.params.galleryId);
  response.status(204).end();
});
