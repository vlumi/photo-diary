const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");

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
app.use(cookieParser());
app.use(express.static("build"));

const registerPreProcessors = () => {
  app.use(middleware.sessionFilter);
  app.use(middleware.requestLogger);
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
