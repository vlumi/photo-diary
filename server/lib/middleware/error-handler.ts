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
  if (error instanceof AppError) {
    logger.debug(error);
    reply.status(error.status).send({ error: error.message });
    return;
  }

  const fastifyStatus = (error as FastifyError).statusCode;
  if (typeof fastifyStatus === "number" && fastifyStatus >= 400 && fastifyStatus < 500) {
    logger.debug(error);
    reply.status(fastifyStatus).send({ error: error.message });
    return;
  }

  // Unexpected exception — log at error level so the stack survives
  // the default `info` log threshold and the operator can diagnose it.
  logger.error(error);
  reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
};

export default errorHandler;
