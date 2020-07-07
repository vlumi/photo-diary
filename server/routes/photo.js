const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/photo`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const photoManager = require("../manager/photo")(db);

    /**
     * Get the properties of all photos.
     */
    app.get(resource, (request, response) => {
      authManager.authorizeAdmin(
        request.session.username,
        () =>
          photoManager.getAllPhotos(
            (photos) => response.json(photos),
            (error) => handleerroor(response, error)
          ),
        (error) => handleError(response, error)
      );
    });
    /**
     * Create the properties of a photo.
     */
    app.post(resource, (request, response) => {
      authManager.authorizeAdmin(
        request.session.username,
        () => {
          // TODO: validate and set content from request.body
          const photo = {};
          response.json(photoManager.createPhoto(photo));
        },
        (error) => handleError(response, error)
      );
    });
    /**
     * Get the properties of a photo.
     */
    app.get(`${resource}/:photoId`, (request, response) => {
      authManager.authorizeAdmin(
        request.session.username,
        () =>
          photoManager.getPhoto(
            request.params.photoId,
            (photo) => response.json(photo),
            (error) => handleError(response, error)
          ),
        (error) => handleError(response, error)
      );
    });
    /**
     * Update the properties of a photo.
     */
    app.put(`${resource}/:photoId`, (request, response) => {
      authManager.authorizeAdmin(
        request.session.username,
        () => {
          // TODO: implement: update photo meta
          response.status(501).end();
        },
        (error) => handleError(response, error)
      );
    });
    /**
     * Delete the properties of a photo.
     */
    app.delete(`${resource}/:photoId`, (request, response) => {
      authManager.authorizeAdmin(
        request.session.username,
        () => {
          // TODO: authorize request.session.username
          photoManager.deletePhoto(request.params.galleryId);
          response.status(204).end();
        },
        (error) => handleError(response, error)
      );
    });
  };
};
