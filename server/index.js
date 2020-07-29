require("dotenv").config();
const http = require("http");

const { app, init } = require("./app");
const config = require("./lib/config");
const logger = require("./lib/logger");

const server = http.createServer(app);

init()
  .then(() => {
    server.listen(config.PORT, () => {
      logger.info("Server running on port", config.PORT);
    });
  })
  .catch((error) => logger.error("Failed to start:", error));
