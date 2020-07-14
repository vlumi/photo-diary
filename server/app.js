const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("express-async-errors");

const config = require("./utils/config");
const sessionsRouter = require("./controllers/sessions");
const statsRouter = require("./controllers/stats");
const galleriesRouter = require("./controllers/galleries");
const photosRouter = require("./controllers/photos");
const galleryPhotosRouter = require("./controllers/gallery-photos");
const middleware = require("./utils/middleware");

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
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/galleries", galleriesRouter);
  app.use("/api/photos", photosRouter);
  app.use("/api/gallery-photos", galleryPhotosRouter);
};
const registerPostProcessors = () => {
  app.use(middleware.unknownEndpoint);
  app.use(middleware.errorHandler);
};
registerPreProcessors();
registerRoutes();
registerPostProcessors();

module.exports = app;
