const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/stat`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const statManager = require("../manager/stat")(db);

    app.get(resource, (request, response) => {
      authManager.authorizeView(
        request.session.username,
        () =>
          statManager.getStatistics(
            (stats) => response.json(stats),
            (error) => handleError(response, error)
          ),
        (error) => handleError(response, error)
      );
    });
    app.get(`${resource}/:galleryId`, (request, response) => {
      authManager.authorizeGalleryView(
        request.session.username,
        request.params.galleryId,
        () =>
          statManager.getGalleryStatistics(
            request.params.galleryId,
            (stats) => response.json(stats),
            (error) => handleError(response, error)
          ),
        (error) => handleError(response, error)
      );
    });
  };
};
