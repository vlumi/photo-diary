const CONST = require("../constants.cjs");
const tokensModel = require("../../models/token.cjs")();
const logger = require("../logger.cjs");

module.exports = (request, response, next) => {
  request.user = undefined;
  request.token = undefined;

  const initGuest = () => {
    logger.debug("Using anonymous guest");
    request.user = {
      id: CONST.GUEST_USER,
    };
  };

  const getToken = (request) => {
    const token = request.get("Authorization");
    if (token && token.toLowerCase().startsWith("bearer")) {
      return token.substring(7);
    }
    return undefined;
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
      request.user = user;
      request.token = token;
      next();
    })
    .catch((error) => {
      logger.debug("Token verification failed", error);
      next(CONST.ERROR_INVALID_TOKEN);
    });
};
