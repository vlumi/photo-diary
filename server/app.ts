import express from "express";
import cors from "cors";
import compression from "compression";

import config from "./lib/config/index.js";

import metaV1 from "./controllers/meta-v1.js";
import tokensV1 from "./controllers/tokens-v1.js";
import usersV1 from "./controllers/users-v1.js";
import galleriesV1 from "./controllers/galleries-v1.js";
import photosV1 from "./controllers/photos-v1.js";
import galleryPhotosV1 from "./controllers/gallery-photos-v1.js";

import middleware from "./lib/middleware/index.js";
import logger from "./lib/logger.js";

export const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
// Discourage indexing and AI scraping on every response. robots.txt is the
// authoritative signal; this header covers non-HTML resources (photo files)
// and reaches scrapers that honor X-Robots-Tag values like `noai`/`noimageai`.
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, noai, noimageai");
  next();
});
app.use(express.static("build"));
app.use("/g", express.static("build"));
app.use("/g/*splat", express.static("build"));

const registerPreProcessors = () => {
  app.use(middleware.tokenFilter);
  /* istanbul ignore next */
  if (config.ENV !== "test") {
    app.use(middleware.requestLogger);
  }
};
const registerRoutes = () => {
  app.use("/api/v1/meta", metaV1.router);
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

export const init = async () => {
  logger.debug("Initialize app start");
  await tokensV1.init();
  await galleriesV1.init();
  await photosV1.init();
  await galleryPhotosV1.init();
  logger.debug("Initialize app done");
};

export default { app, init };
