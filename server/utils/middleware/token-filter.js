const CONST = require("../constants");
const tokensModel = require("../../models/tokens")();
const logger = require("../logger");

module.exports = (request, response, next) => {
  request.user = undefined;
  request.token = undefined;

  const initGuest = () => {
    logger.debug("Using anonymous guest");
    request.user = {
      username: "guest",
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
  if (
    !token ||
    (request.url === "/api/tokens" && request.method === "POST")
  ) {
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
      initGuest();
      tokensModel
        .revokeToken(token)
        .then(() => {
          logger.debug("Token revokated", token);
        })
        .catch(() => {
          logger.debug("Token revokation failed", token, error);
          next();
        })
        .finally(() => {
          next(CONST.ERROR_INVALID_TOKEN);
        });
    });
};
