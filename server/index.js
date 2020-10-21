import dotenv from "dotenv";
import http from "http";

import { app, init } from "./app.cjs";
import config from "./lib/config/index.cjs";
import logger from "./lib/logger.cjs";

dotenv.config();

const server = http.createServer(app);

init()
  .then(() => {
    server.listen(config.PORT, () => {
      logger.info("Server running on port", config.PORT);
    });
  })
  .catch((error) => logger.error("Failed to start:", error));
