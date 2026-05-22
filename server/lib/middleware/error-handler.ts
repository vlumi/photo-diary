import type { ErrorRequestHandler } from "express";
import * as HttpStatus from "http-status-codes";

import { AppError } from "../errors.js";
import logger from "../logger.js";

// Every server-side throw flows through here. Typed `AppError` subclasses
// carry their HTTP status; anything else is an unexpected exception and gets
// a generic 500.
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  logger.debug(error);

  if (error instanceof AppError) {
    response.status(error.status).send({ error: error.message });
    return;
  }

  response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error });
};

export default errorHandler;
