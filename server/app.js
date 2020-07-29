const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("express-async-errors");

const config = require("./lib/config");

const tokens = require("./controllers/tokens");
const users = require("./controllers/users");
const stats = require("./controllers/stats");
const galleries = require("./controllers/galleries");
const photos = require("./controllers/photos");
const galleryPhotos = require("./controllers/gallery-photos");

const middleware = require("./lib/middleware");
const logger = require("./lib/logger");

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static("build"));
app.use("/g", express.static("build"));
app.use("/g/*", express.static("build"));

const registerPreProcessors = () => {
  app.use(middleware.tokenFilter);
  if (config.ENV !== "test") {
    app.use(middleware.requestLogger);
  }
};
const registerRoutes = () => {
  app.use("/api/tokens", tokens.router);
  app.use("/api/users", users.router);
  app.use("/api/stats", stats.router);
  app.use("/api/galleries", galleries.router);
  app.use("/api/photos", photos.router);
  app.use("/api/gallery-photos", galleryPhotos.router);
};
const registerPostProcessors = () => {
  app.use(middleware.unknownEndpoint);
  app.use(middleware.errorHandler);
};
registerPreProcessors();
registerRoutes();
registerPostProcessors();

const init = async () => {
  logger.debug("Initialize app start");
  await tokens.init();
  await stats.init();
  await galleries.init();
  await photos.init();
  await galleryPhotos.init();
  logger.debug("Initialize app done");
};

module.exports = {
  app,
  init,
};
