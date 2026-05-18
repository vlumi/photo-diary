import * as HttpStatus from "http-status-codes";

import CONST from "../constants.js";
import logger from "../logger.js";

export default function (error, request, response, _next) {
  logger.debug(error);
  switch (error) {
    case CONST.ERROR_NOT_FOUND:
      response.status(HttpStatus.NOT_FOUND).send({ error });
      break;
    case CONST.ERROR_NOT_IMPLEMENTED:
      response.status(HttpStatus.NOT_IMPLEMENTED).send({ error });
      break;
    case CONST.ERROR_INVALID_TOKEN:
    case CONST.ERROR_LOGIN:
      response.status(HttpStatus.UNAUTHORIZED).send({ error });
      break;
    case CONST.ERROR_ACCESS_DELEGATE:
      response.status(HttpStatus.FORBIDDEN).send({ error: CONST.ERROR_ACCESS });
      break;
    case CONST.ERROR_ACCESS:
      response.status(HttpStatus.FORBIDDEN).send({ error });
      break;
    case CONST.ERROR_UNAVAILABLE:
      response.status(HttpStatus.SERVICE_UNAVAILABLE).send({ error });
      break;
    default:
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error });
      break;
  }
}
