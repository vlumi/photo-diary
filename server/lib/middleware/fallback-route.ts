import type { RequestHandler } from "express";

import CONST from "../constants.js";

const fallbackRoute: RequestHandler = (_request, response) => {
  response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
};

export default fallbackRoute;
