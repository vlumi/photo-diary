const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/gallery`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const galleryManager = require("../manager/gallery")(db);

    /**
     * Get all galleries.
     */
    app.get(resource, (request, response) => {
      galleryManager.getAllGalleries(
        (galleries) => {
          authManager.authorizeGalleryView(
            request.session.username,
            galleries.map((gallery) => gallery.id),
            (authorizedGalleryIds) => {
              const authorizedGalleries = galleries.filter((gallery) =>
                authorizedGalleryIds.includes(gallery.id)
              );
              response.json(authorizedGalleries);
            },
            (error) => handleError(response, error)
          );
        },
        (error) => handleError(response, error)
      );
    });
    /**
     * Create a new gallery.
     */
    app.post(resource, (request, response) => {
      authManager.authorizeAdmin(
        request.session.username,
        () => {
          // TODO: validate and set content from request.body
          const gallery = {};
          response.json(galleryManager.createGallery(gallery));
        },
        (error) => handleError(response, error)
      );
    });
    /**
     * Get a single gallery, including its photos.
     */
    app.get(`${resource}/:galleryId`, (request, response) => {
      authManager.authorizeGalleryView(
        request.session.username,
        request.params.galleryId,
        () =>
          galleryManager.getGallery(
            request.params.galleryId,
            (data) => response.json(data),
            (error) => handleError(response, error)
          ),
        (error) => handleError(response, error)
      );
    });
    /**
     * Update gallery properties
     */
    app.put(`${resource}/:galleryId`, (request, response) => {
      authManager.authorizeGalleryAdmin(
        request.session.username,
        request.params.galleryId,
        () => {
          // TODO: validate and set content from request.body
          const gallery = {};
          response.json(galleryManager.updateGallery(gallery));
        },
        (error) => handleError(response, error)
      );
    });
    /**
     * Delete a gallery.
     */
    app.delete(`${resource}/:galleryId`, (request, response) => {
      authManager.authorizeGalleryAdmin(
        request.session.username,
        request.params.galleryId,
        () => {
          galleryManager.deleteGallery(request.params.galleryId);
          response.status(204).end();
        },
        (error) => handleError(response, error)
      );
      F;
    });
  };
};
