const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/gallery`;

  return (app, db) => {
    const galleryManager = require("../manager/gallery")(db);

    app.get(resource, (request, response) => {
      // TODO: authorize request.session.username
      galleryManager.getAllGalleries(
        (galleries) => response.json(galleries),
        (error) => handleError(response, error)
      );
    });
    app.post(resource, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: validate and set content from request.body
      const gallery = {};
      response.json(galleryManager.createGallery(gallery));
    });
    app.get(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      galleryManager.getGallery(
        request.params.galleryId,
        (data) => response.json(data),
        (error) => handleError(response, error)
      );
    });
    app.put(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: validate and set content from request.body
      const gallery = {};
      response.json(galleryManager.updateGallery(gallery));
    });
    app.delete(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      galleryManager.deleteGallery(request.params.galleryId);
      response.status(204).end();
    });
  };
};
