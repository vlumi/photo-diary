const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/stat`;

  return (app, db) => {
    const statManager = require("../manager/stat")(db);

    app.get(resource, (request, response) => {
      // TODO: authorize request.session.username
      statManager.getStatistics(
        (stats) => response.json(stats),
        (error) => handleError(response, error)
      );
    });
    app.get(`${resource}/:galleryId`, (request, response) => {
      // TODO: authorize request.session.username
      statManager.getGalleryStatistics(
        request.params.galleryId,
        (stats) => response.json(stats),
        (error) => handleError(response, error)
      );
    });
  };
};
