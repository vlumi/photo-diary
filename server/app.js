const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("express-async-errors");

const config = require("./utils/config");

const sessions = require("./controllers/sessions");
const stats = require("./controllers/stats");
const galleries = require("./controllers/galleries");
const photos = require("./controllers/photos");
const galleryPhotos = require("./controllers/gallery-photos");

const middleware = require("./utils/middleware");
const logger = require("./utils/logger");

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static("build"));

const registerPreProcessors = () => {
  app.use(middleware.sessionFilter);
  if (config.ENV !== "test") {
    app.use(middleware.requestLogger);
  }
};
const registerRoutes = () => {
  app.use("/api/sessions", sessions.router);
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
  await sessions.init();
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
