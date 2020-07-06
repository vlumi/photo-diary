const CONST = require("../constants");

module.exports = (app, dao, handleError) => {
  const routesSession = require("./session")(CONST.API_ROOT, handleError);
  const routesStat = require("./stat")(CONST.API_ROOT, handleError);
  const routesGallery = require("./gallery")(CONST.API_ROOT, handleError);
  const routesPhoto = require("./photo")(CONST.API_ROOT, handleError);
  const routesGalleryPhoto = require("./gallery-photo")(
    CONST.API_ROOT,
    handleError
  );

  routesSession(app, dao);
  routesStat(app, dao);
  routesGallery(app, dao);
  routesPhoto(app, dao);
  routesGalleryPhoto(app, dao);

  app.use((request, response) => {
    response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
  });
  app.use(function (error, request, response, next) {
    console.error(error);
    switch (error) {
      case CONST.ERROR_NOT_IMPLEMENTED:
      case CONST.ERROR_NOT_FOUND:
        response.status(501).send(error);
        break;
      default:
        response.status(500).send(`Error: ${error}`);
    }
  });
};
