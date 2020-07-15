const authorizer = require("../utils/authorizer")();
const galleryPhotosModel = require("../models/gallery-photos")();

const init = async () => {
  await galleryPhotosModel.init();
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
    request.session.username,
    request.params.galleryId
  );
  const photo = await galleryPhotosModel.getPhoto(
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
    request.session.username,
    request.params.galleryId
  );
  await galleryPhotosModel.linkPhoto(
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
    request.session.username,
    request.params.galleryId
  );
  await galleryPhotosModel.unlinkPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.status(204).end();
});
