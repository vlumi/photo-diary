const CONST = require("../constants");

module.exports = (root, handleError) => {
  const resource = `${root}/stat`;

  return (app, db) => {
    const authManager = require("../manager/auth")(db);
    const statManager = require("../manager/stat")(db);

    app.get(resource, (request, response, next) => {
      authManager
        .authorizeView(request.session.username)
        .then(() => {
          statManager
            .getStatistics()
            .then((stats) => response.json(stats))
            .catch((error) => next(error));
        })
        .catch((error) => next(error));
    });
    app.get(`${resource}/:galleryId`, (request, response, next) => {
      authManager
        .authorizeGalleryView(
          request.session.username,
          request.params.galleryId
        )
        .then(() => {
          statManager
            .getGalleryStatistics(request.params.galleryId)
            .then((stats) => response.json(stats))
            .catch((error) => next(error));
        })
        .catch((error) => next(error));
    });
  };
};
