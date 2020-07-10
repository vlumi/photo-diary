const router = require("express").Router();
module.exports = router;

const authManager = require("../utils/auth")();
const photoManager = require("../manager/photos")();

/**
 * Get the properties of all photos.
 */
router.get("/", (request, response, next) => {
  authManager
    .authorizeView(request.session.username)
    .then(() => {
      photoManager
        .getAllPhotos()
        .then((photos) => {
          response.json(photos);
        })
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Create the properties of a photo.
 */
router.post("/", (request, response, next) => {
  authManager
    .authorizeAdmin(request.session.username)
    .then(() => {
      // TODO: validate and set content from request.body
      const photo = {};
      photoManager
        .createPhoto(photo)
        .then((photo) => response.json(photo))
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Get the properties of a photo.
 */
router.get("/:photoId", (request, response, next) => {
  authManager
    .authorizeView(request.session.username)
    .then(() => {
      photoManager
        .getPhoto(request.params.photoId)
        .then((photo) => response.json(photo))
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Update the properties of a photo.
 */
router.put("/:photoId", (request, response, next) => {
  authManager
    .authorizeAdmin(request.session.username)
    .then(() => {
      // TODO: implement: update photo meta
      response.status(501).end();
    })
    .catch((error) => next(error));
});
/**
 * Delete the properties of a photo.
 */
router.delete("/:photoId", (request, response, next) => {
  authManager
    .authorizeAdmin(request.session.username)
    .then(() => {
      photoManager
        .deletePhoto(request.params.galleryId)
        .then(() => response.status(204).end())
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
