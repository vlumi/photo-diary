import "dotenv/config";
import http from "node:http";

import { app, init } from "./app.js";
import config from "./lib/config/index.js";
import logger from "./lib/logger.js";

const server = http.createServer(app);

init()
  .then(() => {
    server.listen(config.PORT, () => {
      logger.info("Server running on port", config.PORT);
    });
  })
  .catch((error) => logger.error("Failed to start:", error));
