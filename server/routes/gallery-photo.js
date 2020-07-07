const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/gallery-photo`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const galleryPhotoManager = require("../manager/gallery-photo")(db);

    /**
     * Get the properties of a photo in gallery context.
     */
    app.get(`${resource}/:galleryId/:photoId`, (request, response) => {
      authManager.authorizeGalleryView(
        request.session.username,
        request.params.galleryId,
        () =>
          galleryPhotoManager.getPhoto(
            request.params.galleryId,
            request.params.photoId,
            (photo) => response.json(photo),
            (error) => handleError(response, error)
          ),
        (error) => handleError(response, error)
      );
    });
    /**
     * Link a photo to a gallery.
     */
    app.put(`${resource}/:galleryId/:photoId`, (request, response) => {
      authManager.authorizeGalleryAdmin(
        request.session.username,
        request.params.galleryId,
        () => {
          // TODO: validate and set content from request.body
          const photo = {};
          galleryPhotoManager.linkPhoto(
            galleryId,
            photoId,
            () => {
              response.status(204).end();
            },
            (error) => {
              handleError(response, error);
            }
          );
        },
        (error) => handleError(response, error)
      );
    });
    /**
     * Unlink a photo from a gallery.
     */
    app.delete(`${resource}/:galleryId/:photoId`, (request, response) => {
      authManager.authorizeGalleryAdmin(
        request.session.username,
        request.params.galleryId,
        () => {
          galleryPhotoManager.unlinkPhoto(
            galleryId,
            photoId,
            () => {
              response.status(204).end();
            },
            (error) => {
              handleError(response, error);
            }
          );
        },
        (error) => handleError(response, error)
      );
    });
  };
};
