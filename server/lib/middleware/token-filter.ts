import type { Request, RequestHandler } from "express";

import CONST from "../constants.js";
import { InvalidTokenError } from "../errors.js";
import tokenFactory from "../../models/token.js";
import logger from "../logger.js";

const tokensModel = tokenFactory();

const getToken = (request: Request): string | undefined => {
  const token = request.get("Authorization");
  if (token && token.toLowerCase().startsWith("bearer")) {
    return token.substring(7);
  }
  return undefined;
};

const tokenFilter: RequestHandler = (request, _response, next) => {
  request.token = undefined;

  const initGuest = () => {
    logger.debug("Using anonymous guest");
    request.user = {
      id: CONST.GUEST_USER,
    };
  };

  const token = getToken(request);
  if (!token || (request.url === "/api/tokens" && request.method === "POST")) {
    initGuest();
    next();
    return;
  }
  tokensModel
    .verifyToken(token)
    .then((user) => {
      logger.debug("Verified token", user);
      // verifyToken already asserts payload.id is a non-empty string.
      request.user = user as unknown as Request["user"];
      request.token = token;
      next();
    })
    .catch((error) => {
      logger.debug("Token verification failed", error);
      next(new InvalidTokenError());
    });
};

export default tokenFilter;
