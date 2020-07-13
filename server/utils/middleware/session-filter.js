const CONST = require("../../utils/constants");
const sessionsModel = require("../../models/sessions")();
const logger = require("../logger");

module.exports = (request, response, next) => {
  const token = request.cookies["token"];
  const initGuestSession = () => {
    logger.debug("Using anonymous guest session");
    request.session = {
      username: "guest",
      created: undefined,
      updated: undefined,
    };
  };
  if (token) {
    logger.debug("Filtering session by token", token);
    sessionsModel
      .verifySession(token)
      .then((session) => {
        logger.debug("Verified session", session);
        request.session = session;
        next();
      })
      .catch((error) => {
        logger.debug("Session verification failed", error);
        initGuestSession();
        response.clearCookie("token");
        sessionsModel
          .revokeSession(token)
          .then(() => {
            logger.debug("Session revokated", token);
          })
          .catch(() => {
            logger.debug("Session revokation failed", token, error);
            next();
          })
          .finally(() => {
            next(CONST.ERROR_SESSION_EXPIRED);
          });
      });
  } else {
    initGuestSession();
    next();
  }
};
