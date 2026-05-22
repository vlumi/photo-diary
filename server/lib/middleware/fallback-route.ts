import { NotFoundError } from "../errors.js";

// Registered via `setNotFoundHandler`. Fastify invokes this when no route
// matches; throwing here routes the response through `errorHandler`, which
// reads `NotFoundError.status` (404) and formats the body.
const fallbackRoute = () => {
  throw new NotFoundError();
};

export default fallbackRoute;
