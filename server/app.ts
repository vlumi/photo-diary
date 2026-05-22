import path from "node:path";

import express from "express";
import compression from "compression";
import helmet from "helmet";

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
// nginx sits in front of every supported deploy; trust one hop so
// `req.ip` reflects the real client and rate-limiters key off the right
// address instead of all looking like 127.0.0.1.
app.set("trust proxy", 1);
// helmet sets a baseline of security headers (HSTS, nosniff, frame-ancestors
// DENY, Referrer-Policy, Permissions-Policy, …). CSP is left off — the
// default policy would break the bundle's inline styles / dynamic imports
// and warrants its own audit before being enabled.
//
// `Referrer-Policy` overridden from helmet's default `no-referrer` to
// `strict-origin-when-cross-origin` (modern browser default since 2020):
// the no-referrer default strips the `Referer` header on every outbound
// request, which breaks the leaflet map widget — OSM's volunteer-run tile
// servers reject referrer-less requests as bot traffic (osm.wiki/Blocked).
// `strict-origin-when-cross-origin` sends just the origin
// (https://gallery.example.com) on cross-origin HTTPS requests, satisfying
// OSM's check without leaking the full request URL.
app.use(
  helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);
app.use(compression());
app.use(express.json());
// Discourage indexing and AI scraping on every response. robots.txt is the
// authoritative signal; this header covers non-HTML resources (photo files)
// and reaches scrapers that honor X-Robots-Tag values like `noai`/`noimageai`.
app.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, noai, noimageai");
  next();
});
// Multi-instance deploys may invoke the server from a different CWD (the
// per-instance directory), so resolve the bundled frontend relative to this
// source file by default. `STATIC_DIR` overrides if you need a different
// build location.
const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(import.meta.dirname, "build");
app.use(express.static(STATIC_DIR));
app.use("/g", express.static(STATIC_DIR));
app.use("/g/*splat", express.static(STATIC_DIR));

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
