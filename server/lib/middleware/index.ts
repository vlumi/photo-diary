import requestLogger from "./request-logger.js";
import fallbackRoute from "./fallback-route.js";
import errorHandler from "./error-handler.js";
import tokenFilter from "./token-filter.js";
import hostScopeFilter from "./host-scope-filter.js";

export default {
  requestLogger,
  fallbackRoute,
  errorHandler,
  tokenFilter,
  hostScopeFilter,
};
