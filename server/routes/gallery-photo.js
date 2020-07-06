module.exports = (root, handleError) => {
  const resource = `${root}/gallery-photo`;
  return (app, dao) => {
    app.put(`${resource}/:galleryId/:photoId`, (request, response) => {
      // TODO: authorize
      // TODO: validate and set content from request.body
      const photo = {};
      dao.linkPhoto(
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
      // TODO: authorize
      dao.unlinkPhoto(
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
