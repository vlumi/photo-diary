const requestLogger = require("./request-logger");
const unknownEndpoint = require("./fallback-route");
const errorHandler = require("./error-handler");
const tokenFilter = require("./token-filter");

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenFilter,
};
