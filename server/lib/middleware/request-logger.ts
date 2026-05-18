/* istanbul ignore file */
import type { Request } from "express";
import morgan from "morgan";

morgan.token<Request>("userId", (request) => request.user?.id ?? "");

export default morgan(
  ":method :url :status :res[content-length] - :response-time ms :userId"
);
