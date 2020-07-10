const router = require("express").Router();
module.exports = router;

const authorizer = require("../utils/authorizer")();
const galleryPhotosModel = require("../models/gallery-photos")();

/**
 * Get the properties of a photo in gallery context.
 */
router.get("/:galleryId/:photoId", (request, response, next) => {
  authorizer
    .authorizeGalleryView(request.session.username, request.params.galleryId)
    .then(() =>
      galleryPhotosModel
        .getPhoto(request.params.galleryId, request.params.photoId)
        .then((photo) => response.json(photo))
        .catch((error) => next(error))
    )
    .catch((error) => next(error));
});
/**
 * Link a photo to a gallery.
 */
router.put("/:galleryId/:photoId", (request, response, next) => {
  authorizer
    .authorizeGalleryAdmin(request.session.username, request.params.galleryId)
    .then(() => {
      // TODO: validate and set content from request.body
      galleryPhotosModel
        .linkPhoto(request.params.galleryId, request.params.photoId)
        .then(() => {
          response.status(204).end();
        })
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Unlink a photo from a gallery.
 */
router.delete("/:galleryId/:photoId", (request, response, next) => {
  authorizer
    .authorizeGalleryAdmin(request.session.username, request.params.galleryId)
    .then(() => {
      galleryPhotosModel
        .unlinkPhoto(request.params.galleryId, request.params.photoId)
        .then(() => {
          response.status(204).end();
        })
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
