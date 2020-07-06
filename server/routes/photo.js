module.exports = (root, handleError) => {
  const resource = `${root}/photo`;
  return (app, dao) => {
    app.get(resource, (request, response) => {
      // TODO: authorize request.session.username
      dao.getAllPhotos(
        (photos) => response.json(photos),
        (error) => handleerroor(response, error)
      );
    });
    app.post(resource, (request, response) => {
      // TODO: authorize request.session.username
      // TODO: validate and set content from request.body
      const photo = {};
      response.json(dao.createPhoto(photo));
    });
    app.get(`${resource}/:photoId`, (request, response) => {
      // TODO: authorize request.session.username
      dao.getPhoto(
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
      dao.deletePhoto(request.params.galleryId);
      response.status(204).end();
    });
  };
};
