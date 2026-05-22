import path from "node:path";

import Fastify, { type FastifyInstance } from "fastify";
import fastifyExpress from "@fastify/express";
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

// First step of the Fastify migration (#167, slice 1): the public surface is
// a Fastify instance, but every existing Express middleware / controller is
// mounted through `@fastify/express`. This preserves the entire request
// pipeline (routing, params, body parsing, error handling, supertest tests)
// unchanged while the host framework moves. Subsequent slices convert
// controllers + middleware to native Fastify and drop the adapter.
export const app: FastifyInstance = Fastify({
  // Disable Fastify's own logger — morgan still drives request logging via
  // the Express adapter for now (switched to pino in slice 2).
  logger: false,
  // Match Express's behaviour: take exactly one hop of `X-Forwarded-For`
  // unwrapping from nginx so req.ip / rate-limiter keying still works.
  trustProxy: 1,
});

const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(import.meta.dirname, "build");

// Register the entire Express pipeline as Fastify plugins at module load —
// Fastify requires all plugins to be registered before `app.ready()`, and the
// test suite re-calls `init()` between tests, so registration cannot live
// inside `init()` without double-registering.
await app.register(fastifyExpress);

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
app.use(express.static(STATIC_DIR));
app.use("/g", express.static(STATIC_DIR));
app.use("/g/*splat", express.static(STATIC_DIR));

app.use(middleware.tokenFilter);
/* istanbul ignore next */
if (config.ENV !== "test") {
  app.use(middleware.requestLogger);
}

app.use("/api/v1/meta", metaV1.router);
app.use("/api/v1/tokens", tokensV1.router);
app.use("/api/v1/users", usersV1.router);
app.use("/api/v1/galleries", galleriesV1.router);
app.use("/api/v1/photos", photosV1.router);
app.use("/api/v1/gallery-photos", galleryPhotosV1.router);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export const init = async () => {
  logger.debug("Initialize app start");
  await tokensV1.init();
  await galleriesV1.init();
  await photosV1.init();
  await galleryPhotosV1.init();
  await app.ready();
  logger.debug("Initialize app done");
};

export default { app, init };
