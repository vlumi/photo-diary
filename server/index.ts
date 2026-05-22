import "dotenv/config";

import { app, init } from "./app.js";
import config from "./lib/config/index.js";
import logger from "./lib/logger.js";

init()
  .then(() => app.listen({ port: Number(config.PORT), host: "0.0.0.0" }))
  .then(() => logger.info("Server running on port", config.PORT))
  .catch((error) => logger.error("Failed to start:", error));
