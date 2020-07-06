module.exports = (root, handleError) => {
  const resource = `${root}/gallery`;
  return (app, dao) => {
    app.get(resource, (request, response) => {
      // TODO: authorize request.session.username
      dao.getAllGalleries(
        (galleries) => response.json(galleries),
        (error) => handleError(response, error)
      );
    });
    app.post(resource, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: validate and set content from request.body
      const gallery = {};
      response.json(dao.createGallery(gallery));
    });
    app.get(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      dao.getGallery(
        request.params.galleryId,
        (data) => response.json(data),
        (error) => handleError(response, error)
      );
    });
    app.put(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: validate and set content from request.body
      const gallery = {};
      response.json(dao.updateGallery(gallery));
    });
    app.delete(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      dao.deleteGallery(request.params.galleryId);
      response.status(204).end();
    });
  };
};
