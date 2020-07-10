const morgan = require("morgan");

const CONST = require("./constants");
const db = require("../db");
const sessionManager = require("../manager/sessions")(db);
// const logger = require("./logger");

// const requestLogger = (request, response, next) => {
//   logger.info("Method:", request.method);
//   logger.info("Path:  ", request.path);
//   logger.info("Body:  ", request.body);
//   logger.info("---");
//   next();
// };

morgan.token("username", function (request) {
  if ("session" in request && "username" in request.session) {
    return request.session.username;
  } else {
    return "";
  }
});

const requestLogger = morgan(
  ":method :url :status :res[content-length] - :response-time ms :username"
);

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
};

const errorHandler = function (error, request, response, next) {
  if (CONST.DEBUG) console.log(error);
  switch (error) {
    case CONST.ERROR_SESSION_EXPIRED:
      // TODO: notify user, but ok...
      break;
    case CONST.ERROR_NOT_IMPLEMENTED:
    case CONST.ERROR_NOT_FOUND:
      response.status(501).send({ error });
      break;
    case CONST.ERROR_LOGIN:
    default:
      response.status(500).send({ error });
      break;
  }
  next(error);
};

const sessionFilter = (request, response, next) => {
  const token = request.cookies["token"];
  const initGuestSession = () => {
    request.session = {
      username: "guest",
      created: undefined,
      updated: undefined,
    };
  };
  if (token) {
    sessionManager
      .verifySession(token)
      .then((session) => {
        console.log("session", session);
        request.session = session;
        next();
      })
      .catch((error) => {
        console.log("error", error);
        initGuestSession();
        response.clearCookie("token");
        sessionManager
          .revokeSession(token)
          .then(() => {
            // TODO: notify expiry
            next();
          })
          .catch(() => {
            // TODO: notify expiry
            next();
          });
      });
  } else {
    initGuestSession();
    next();
  }
};

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  sessionFilter,
};
