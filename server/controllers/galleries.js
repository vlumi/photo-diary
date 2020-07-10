const router = require("express").Router();
module.exports = router;

const authorizer = require("../utils/authorizer")();
const galleriesModel = require("../models/galleries")();

/**
 * Get all galleries.
 */
router.get("/", (request, response, next) => {
  galleriesModel
    .getAllGalleries()
    .then((galleries) => {
      authorizer
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
  authorizer
    .authorizeAdmin(request.session.username)
    .then(() => {
      const gallery = {};
      response
        .json(galleriesModel.createGallery(gallery))
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
  authorizer
    .authorizeGalleryView(request.session.username, request.params.galleryId)
    .then(() => {
      galleriesModel
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
  authorizer
    .authorizeGalleryAdmin(request.session.username, request.params.galleryId)
    .then(() => {
      // TODO: validate and set content from request.body
      const gallery = {};
      galleriesModel
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
  authorizer
    .authorizeGalleryAdmin(request.session.username, request.params.galleryId)
    .then(() => {
      galleriesModel
        .deleteGallery(request.params.galleryId)
        .then(() => response.status(204).end())
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
