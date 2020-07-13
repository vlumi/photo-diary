const CONST = require("../constants");
const logger = require("../logger");

module.exports = function (error, request, response, next) {
  logger.debug(error);
  switch (error) {
    case CONST.ERROR_NOT_FOUND:
      response.status(404).send({ error });
      break;
    case CONST.ERROR_NOT_IMPLEMENTED:
      response.status(501).send({ error });
      break;
    case CONST.ERROR_SESSION_EXPIRED:
    case CONST.ERROR_LOGIN:
      response.status(401).send({ error });
      break;
    case CONST.ERROR_ACCESS:
      response.status(403).send({ error });
      break;
    default:
      response.status(500).send({ error });
      break;
  }
  next(error);
};
