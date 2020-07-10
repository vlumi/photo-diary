const CONST = require("../utils/constants");

module.exports = (app) => {
  require("./session")(CONST.API_ROOT, app);
  require("./stat")(CONST.API_ROOT, app);
  require("./gallery")(CONST.API_ROOT, app);
  require("./photo")(CONST.API_ROOT, app);
  require("./gallery-photo")(CONST.API_ROOT, app);

  app.use((request, response) => {
    response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
  });
  app.use(function (error, request, response, next) {
    if (CONST.DEBUG) console.log(error);
    switch (error) {
      case CONST.ERROR_SESSION_EXPIRED:
        // TODO: notify user, but ok...
        break;
      case CONST.ERROR_NOT_IMPLEMENTED:
      case CONST.ERROR_NOT_FOUND:
        response.status(501).send({ error });
        break;
      case CONST.ERROR_LOGIN:
      default:
        response.status(500).send({ error });
        break;
    }
    next(error);
  });
};
