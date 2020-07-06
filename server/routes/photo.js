const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/photo`;

  return (app, db) => {
    const photoManager = require("../manager/photo")(db);

    app.get(resource, (request, response) => {
      // TODO: authorize request.session.username
      photoManager.getAllPhotos(
        (photos) => response.json(photos),
        (error) => handleerroor(response, error)
      );
    });
    app.post(resource, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: validate and set content from request.body
      const photo = {};
      response.json(photoManager.createPhoto(photo));
    });
    app.get(`${resource}/:photoId`, (request, response) => {
      // TODO: authorize request.session.username
      photoManager.getPhoto(
        request.params.photoId,
        (photo) => response.json(photo),
        (error) => handleError(response, error)
      );
    });
    app.put(`${resource}/:photoId`, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: implement: update photo meta
      response.status(501).end();
    });
    app.delete(`${resource}/:photoId`, (request, response) => {
      // TODO: authorize request.session.username
      photoManager.deletePhoto(request.params.galleryId);
      response.status(204).end();
    });
  };
};
