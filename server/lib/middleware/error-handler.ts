import type { ErrorRequestHandler } from "express";
import * as HttpStatus from "http-status-codes";

import CONST from "../constants.js";
import { AppError } from "../errors.js";
import logger from "../logger.js";

// Two error shapes co-exist during the typed-Error migration (#219):
//
// 1. `AppError` subclasses with a `.status` property. Preferred for new code
//    and the migration target.
// 2. Legacy `CONST.ERROR_*` string constants. Still works via the switch
//    below — kept for the duration of the migration so a partial rollout
//    doesn't break anything.
//
// New-style errors get their `.message` echoed as the response payload; old
// string-style throws echo the string as-is. The wire shape stays the same.
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  logger.debug(error);

  if (error instanceof AppError) {
    response.status(error.status).send({ error: error.message });
    return;
  }

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
};

export default errorHandler;
