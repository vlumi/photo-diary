const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("express-async-errors");

const config = require("./lib/config");

const tokensV1 = require("./controllers/tokens-v1");
const usersV1 = require("./controllers/users-v1");
const galleriesV1 = require("./controllers/galleries-v1");
const photosV1 = require("./controllers/photos-v1");
const galleryPhotosV1 = require("./controllers/gallery-photos-v1");

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
  /* istanbul ignore next */
  if (config.ENV !== "test") {
    app.use(middleware.requestLogger);
  }
};
const registerRoutes = () => {
  app.use("/api/v1/tokens", tokensV1.router);
  app.use("/api/v1/users", usersV1.router);
  app.use("/api/v1/galleries", galleriesV1.router);
  app.use("/api/v1/photos", photosV1.router);
  app.use("/api/v1/gallery-photos", galleryPhotosV1.router);
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
  await tokensV1.init();
  await galleriesV1.init();
  await photosV1.init();
  await galleryPhotosV1.init();
  logger.debug("Initialize app done");
};

module.exports = {
  app,
  init,
};
