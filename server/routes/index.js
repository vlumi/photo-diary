const CONST = require("../constants");

const handleError = (response, error) => {
  console.log(error);
  response.status(500).json({ error: error });
};

const API_ROOT = "/api";
const routesStat = require("./stat")(API_ROOT, handleError);
const routesGallery = require("./gallery")(API_ROOT, handleError);
const routesPhoto = require("./photo")(API_ROOT, handleError);
const routesGalleryPhoto = require("./gallery-photo")(API_ROOT, handleError);

module.exports = (app, dao) => {
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
