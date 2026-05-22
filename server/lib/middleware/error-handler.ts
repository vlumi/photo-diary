import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import * as HttpStatus from "http-status-codes";

import { AppError } from "../errors.js";
import logger from "../logger.js";

// Every server-side throw flows through here. Typed `AppError` subclasses
// carry their HTTP status; framework-built errors (schema validation,
// body-parse failures, etc.) carry their own numeric `statusCode` we
// honor; anything else is an unexpected exception and gets a generic 500.
const errorHandler = (
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) => {
  logger.debug(error);

  if (error instanceof AppError) {
    reply.status(error.status).send({ error: error.message });
    return;
  }

  const fastifyStatus = (error as FastifyError).statusCode;
  if (typeof fastifyStatus === "number" && fastifyStatus >= 400 && fastifyStatus < 500) {
    reply.status(fastifyStatus).send({ error: error.message });
    return;
  }

  reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error });
};

export default errorHandler;
