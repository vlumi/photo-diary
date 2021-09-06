import requestLogger from "./request-logger.js";
import unknownEndpoint from "./fallback-route.js";
import errorHandler from "./error-handler.js";
import tokenFilter from "./token-filter.js";

export default {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenFilter,
};
