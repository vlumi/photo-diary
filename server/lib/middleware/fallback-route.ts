import { NotFoundError } from "../errors.js";

// Throw so the response goes through `errorHandler` for uniform formatting.
const fallbackRoute = () => {
  throw new NotFoundError();
};

export default fallbackRoute;
