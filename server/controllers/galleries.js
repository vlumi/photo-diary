const router = require("express").Router();
module.exports = router;

const authManager = require("../utils/auth")();
const galleryManager = require("../manager/galleries")();

/**
 * Get all galleries.
 */
router.get("/", (request, response, next) => {
  galleryManager
    .getAllGalleries()
    .then((galleries) => {
      authManager
        .authorizeGalleryView(
          request.session.username,
          galleries.map((gallery) => gallery.id)
        )
        .then((authorizedGalleryIds) => {
          const authorizedGalleries = galleries.filter((gallery) =>
            authorizedGalleryIds.includes(gallery.id)
          );
          response.json(authorizedGalleries);
        })
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Create a new gallery.
 */
router.post("/", (request, response, next) => {
  authManager
    .authorizeAdmin(request.session.username)
    .then(() => {
      const gallery = {};
      response
        .json(galleryManager.createGallery(gallery))
        .then(() => {
          // TODO: validate and set content from request.body
        })
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Get a single gallery, including its photos.
 */
router.get("/:galleryId", (request, response, next) => {
  authManager
    .authorizeGalleryView(request.session.username, request.params.galleryId)
    .then(() => {
      galleryManager
        .getGallery(request.params.galleryId)
        .then((data) => response.json(data))
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Update gallery properties
 */
router.put("/:galleryId", (request, response, next) => {
  authManager
    .authorizeGalleryAdmin(request.session.username, request.params.galleryId)
    .then(() => {
      // TODO: validate and set content from request.body
      const gallery = {};
      galleryManager
        .updateGallery(gallery)
        .then((gallery) => response.json(gallery))
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
/**
 * Delete a gallery.
 */
router.delete("/:galleryId", (request, response, next) => {
  authManager
    .authorizeGalleryAdmin(request.session.username, request.params.galleryId)
    .then(() => {
      galleryManager
        .deleteGallery(request.params.galleryId)
        .then(() => response.status(204).end())
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
