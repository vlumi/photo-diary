import type { RequestHandler } from "express";

import { NotFoundError } from "../errors.js";

const fallbackRoute: RequestHandler = (_request, _response, next) => {
  next(new NotFoundError());
};

export default fallbackRoute;
