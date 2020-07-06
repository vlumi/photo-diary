module.exports = (root, handleError) => {
  const resource = `${root}/stat`;
  return (app, dao) => {
    app.get(resource, (request, response) => {
      // TODO: authorize
      dao.getStatistics(
        (stats) => response.json(stats),
        (error) => handleError(response, error)
      );
    });
    app.get(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize
      dao.getGalleryStatistics(
        request.params.galleryId,
        (stats) => response.json(stats),
        (error) => handleError(response, error)
      );
    });
  };
};
