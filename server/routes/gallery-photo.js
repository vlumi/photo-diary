const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/gallery-photo`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const galleryPhotoManager = require("../manager/gallery-photo")(db);

    /**
     * Get the properties of a photo in gallery context.
     */
    app.get(`${resource}/:galleryId/:photoId`, (request, response, next) => {
      authManager
        .authorizeGalleryView(
          request.session.username,
          request.params.galleryId
        )
        .then(() =>
          galleryPhotoManager
            .getPhoto(request.params.galleryId, request.params.photoId)
            .then((photo) => response.json(photo))
            .catch((error) => next(error))
        )
        .catch((error) => next(error));
    });
    /**
     * Link a photo to a gallery.
     */
    app.put(`${resource}/:galleryId/:photoId`, (request, response, next) => {
      authManager
        .authorizeGalleryAdmin(
          request.session.username,
          request.params.galleryId
        )
        .then(() => {
          // TODO: validate and set content from request.body
          const photo = {};
          galleryPhotoManager
            .linkPhoto(galleryId, photoId)
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
    app.delete(`${resource}/:galleryId/:photoId`, (request, response, next) => {
      authManager
        .authorizeGalleryAdmin(
          request.session.username,
          request.params.galleryId
        )
        .then(() => {
          galleryPhotoManager
            .unlinkPhoto(galleryId, photoId)
            .then(() => {
              response.status(204).end();
            })
            .catch((error) => next(error));
        })
        .catch((error) => next(error));
    });
  };
};
