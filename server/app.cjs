const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("express-async-errors");

const config = require("./lib/config/index.cjs");

const tokens = require("./controllers/tokens.cjs");
const users = require("./controllers/users.cjs");
const galleries = require("./controllers/galleries.cjs");
const photos = require("./controllers/photos.cjs");
const galleryPhotos = require("./controllers/gallery-photos.cjs");

const middleware = require("./lib/middleware/index.cjs");
const logger = require("./lib/logger.cjs");

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static("build"));
app.use("/g", express.static("build"));
app.use("/g/*", express.static("build"));

const registerPreProcessors = () => {
  app.use(middleware.tokenFilter);
  /* istanbul ignore next */
  if (config.ENV !== "test") {
    app.use(middleware.requestLogger);
  }
};
const registerRoutes = () => {
  app.use("/api/tokens", tokens.router);
  app.use("/api/users", users.router);
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
  await galleries.init();
  await photos.init();
  await galleryPhotos.init();
  logger.debug("Initialize app done");
};

module.exports = {
  app,
  init,
};
