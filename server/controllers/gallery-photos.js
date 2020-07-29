const authorizer = require("../lib/authorizer")();
const model = require("../models/gallery-photo")();

const init = async () => {
  await model.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

/**
 * Get the properties of a photo in gallery context.
 */
router.get("/:galleryId/:photoId", async (request, response) => {
  await authorizer.authorizeGalleryView(
    request.user.id,
    request.params.galleryId
  );
  const photo = await model.getGalleryPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.json(photo);
});
/**
 * Link a photo to a gallery.
 */
router.put("/:galleryId/:photoId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.id,
    request.params.galleryId
  );
  await model.linkGalleryPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.status(204).end();
});
/**
 * Unlink a photo from a gallery.
 */
router.delete("/:galleryId/:photoId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.id,
    request.params.galleryId
  );
  await model.unlinkGalleryPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.status(204).end();
});
