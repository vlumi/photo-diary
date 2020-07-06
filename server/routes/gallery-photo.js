const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/gallery-photo`;

  return (app, db) => {
    const galleryPhotoManager = require("../manager/gallery-photo")(db);

    app.put(`${resource}/:galleryId/:photoId`, (request, response) => {
      // TODO: authorize request.session.username
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
    });
    app.delete(`${resource}/:galleryId/:photoId`, (request, response) => {
      // TODO: authorize request.session.username
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
    });
  };
};
