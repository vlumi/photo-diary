import express from "express";
import cors from "cors";
import compression from "compression";
import "express-async-errors";

import config from "./lib/config/index.cjs";

import tokens from "./controllers/tokens.cjs";
import users from "./controllers/users.cjs";
import galleries from "./controllers/galleries.cjs";
import photos from "./controllers/photos.cjs";
import galleryPhotos from "./controllers/gallery-photos.cjs";

import middleware from "./lib/middleware/index.cjs";
import logger from "./lib/logger.cjs";

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

export { app, init };
