const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/photo`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const photoManager = require("../manager/photo")(db);

    /**
     * Get the properties of all photos.
     */
    app.get(resource, (request, response, next) => {
      authManager
        .authorizeView(request.session.username)
        .then(() => {
          photoManager.getAllPhotos().then((photos) => {
            response.json(photos);
          });
        })
        .catch((error) => next(error));
    });
    /**
     * Create the properties of a photo.
     */
    app.post(resource, (request, response, next) => {
      authManager
        .authorizeAdmin(request.session.username)
        .then(() => {
          // TODO: validate and set content from request.body
          const photo = {};
          photoManager.createPhoto(photo).then((photo) => response.json(photo));
        })
        .catch((error) => next(error));
    });
    /**
     * Get the properties of a photo.
     */
    app.get(`${resource}/:photoId`, (request, response, next) => {
      authManager
        .authorizeView(request.session.username)
        .then(() =>
          photoManager
            .getPhoto(request.params.photoId)
            .then((photo) => response.json(photo))
        )
        .catch((error) => next(error));
    });
    /**
     * Update the properties of a photo.
     */
    app.put(`${resource}/:photoId`, (request, response, next) => {
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
    app.delete(`${resource}/:photoId`, (request, response, next) => {
      authManager
        .authorizeAdmin(request.session.username)
        .then(() => {
          photoManager
            .deletePhoto(request.params.galleryId)
            .then(() => response.status(204).end());
        })
        .catch((error) => next(error));
    });
  };
};
