import path from "node:path";

import Fastify, { type FastifyInstance } from "fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import fastifyStatic from "@fastify/static";

import config from "./lib/config/index.js";

import metaV1 from "./controllers/meta-v1.js";
import tokensV1 from "./controllers/tokens-v1.js";
import usersV1 from "./controllers/users-v1.js";
import galleriesV1 from "./controllers/galleries-v1.js";
import photosV1 from "./controllers/photos-v1.js";
import galleryPhotosV1 from "./controllers/gallery-photos-v1.js";

import middleware from "./lib/middleware/index.js";
import { NotFoundError } from "./lib/errors.js";
import logger from "./lib/logger.js";

export const app: FastifyInstance = Fastify({
  trustProxy: 1,
  // Express's router treated trailing slashes as optional by default
  // (`strict: false`). The gallery-photos LIST route was registered as
  // `/:galleryId/` but the SPA calls it without the trailing slash —
  // Fastify is strict, so we match Express's lenient behaviour here so
  // existing client URLs keep working. Lives under `routerOptions` to
  // dodge the FSTDEP022 deprecation; Fastify 6 will require it there.
  routerOptions: { ignoreTrailingSlash: true },
  logger:
    config.ENV === "test"
      ? false
      : {
        level: process.env.LOG_LEVEL ?? "info",
        transport:
            config.ENV === "dev"
              ? {
                target: "pino-pretty",
                options: {
                  translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
                  ignore: "pid,hostname",
                  singleLine: true,
                },
              }
              : undefined,
      },
  // We emit one structured per-response log line via the `requestLogger`
  // onResponse hook below — disabling Fastify's built-in completion line
  // keeps logs from being noisy with two lines per request.
  disableRequestLogging: true,
});

const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(import.meta.dirname, "build");

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
await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
await app.register(fastifyCompress);

// Discourage indexing and AI scraping on every response. robots.txt is the
// authoritative signal; this header covers non-HTML resources (photo files)
// and reaches scrapers that honor X-Robots-Tag values like `noai`/`noimageai`.
app.addHook("onSend", async (_request, reply) => {
  reply.header("X-Robots-Tag", "noindex, noai, noimageai");
});

// Multi-instance deploys may invoke the server from a different CWD (the
// per-instance directory), so resolve the bundled frontend relative to this
// source file by default. `STATIC_DIR` overrides if you need a different
// build location.
await app.register(fastifyStatic, {
  root: STATIC_DIR,
  prefix: "/",
});

app.addHook("onRequest", middleware.tokenFilter);
/* istanbul ignore next */
if (config.ENV !== "test") {
  app.addHook("onResponse", middleware.requestLogger);
}

await app.register(metaV1.plugin, { prefix: "/api/v1/meta" });
await app.register(tokensV1.plugin, { prefix: "/api/v1/tokens" });
await app.register(usersV1.plugin, { prefix: "/api/v1/users" });
await app.register(galleriesV1.plugin, { prefix: "/api/v1/galleries" });
await app.register(photosV1.plugin, { prefix: "/api/v1/photos" });
await app.register(galleryPhotosV1.plugin, {
  prefix: "/api/v1/gallery-photos",
});

// Fastify's not-found handler does double duty: SPA routes (`/g`, `/g/*`)
// serve `index.html` so deep links into the calendar tree resolve via React
// Router; everything else (including unknown `/api/*` paths) throws into the
// shared `errorHandler` to get the JSON 404 the API has always produced.
app.setNotFoundHandler(async (request, reply) => {
  const pathOnly = request.url.split("?")[0];
  if (pathOnly === "/g" || pathOnly.startsWith("/g/")) {
    return reply.type("text/html").sendFile("index.html");
  }
  throw new NotFoundError();
});

app.setErrorHandler(middleware.errorHandler);

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
