import type { FastifyRequest, onRequestHookHandler } from "fastify";

import CONST from "../constants.js";
import { InvalidTokenError } from "../errors.js";
import tokenFactory from "../../models/token.js";
import logger from "../logger.js";

const tokensModel = tokenFactory();

const getToken = (request: FastifyRequest): string | undefined => {
  const header = request.headers.authorization;
  if (header && header.toLowerCase().startsWith("bearer")) {
    return header.substring(7);
  }
  return undefined;
};

const tokenFilter: onRequestHookHandler = async (request) => {
  request.token = undefined;

  const token = getToken(request);
  if (!token || (request.url === "/api/tokens" && request.method === "POST")) {
    logger.debug("Using anonymous guest");
    request.user = { id: CONST.GUEST_USER };
    return;
  }
  try {
    const user = await tokensModel.verifyToken(token);
    logger.debug("Verified token", user);
    request.user = user as unknown as FastifyRequest["user"];
    request.token = token;
  } catch (error) {
    logger.debug("Token verification failed", error);
    throw new InvalidTokenError();
  }
};

export default tokenFilter;
