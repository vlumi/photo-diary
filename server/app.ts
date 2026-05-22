import path from "node:path";

import { readFileSync } from "node:fs";

import Fastify from "fastify";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyHelmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import fastifyStatic from "@fastify/static";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

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

export const app = Fastify({
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
}).withTypeProvider<TypeBoxTypeProvider>();

const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(import.meta.dirname, "build");

// Read the server's own `package.json` for the OpenAPI `info.version`. Sync
// I/O at module load is fine here — it's a single small file, one read per
// process. `package.json` lives next to the compiled `app.js` in prod and
// next to `app.ts` in dev; either way `import.meta.dirname` resolves it.
const pkg = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "package.json"), "utf8")
) as { version: string };

// @fastify/swagger introspects every registered route's `schema` into an
// OpenAPI document — it has to register *before* the controllers do, so it
// captures every route as it's added. The spec is queried at any time via
// `app.swagger()`; the UI is exposed separately below.
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Photo Diary API",
      description:
        "Self-hosted photo-diary backend. Schema is generated from " +
        "TypeBox-validated route handlers.",
      version: pkg.version,
    },
    tags: [
      { name: "meta", description: "Per-instance frontend defaults" },
      { name: "tokens", description: "Auth: login, keep-alive, logout" },
      { name: "users", description: "User management (admin)" },
      { name: "galleries", description: "Gallery metadata" },
      { name: "photos", description: "Photo metadata (cross-gallery)" },
      {
        name: "gallery-photos",
        description: "Photo metadata scoped to one gallery",
      },
    ],
    components: {
      securitySchemes: {
        bearer: {
          type: "http",
          scheme: "bearer",
          description:
            "JWT issued by POST /api/v1/tokens. Send as " +
            "`Authorization: Bearer <token>`.",
        },
      },
    },
  },
});

// Swagger UI is opt-in: always on in dev, gated by `ENABLE_DOCS=true` in
// any other environment. The JSON spec endpoint is exposed only when the
// UI is — operators who want the spec for codegen can run
// `npm run docs:dump` instead, which renders the file without exposing it
// over HTTP.
const DOCS_EXPOSED =
  config.ENV === "dev" || process.env.ENABLE_DOCS === "true";
if (DOCS_EXPOSED) {
  await app.register(fastifySwaggerUi, {
    routePrefix: "/api/v1/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}

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

// Register the global error handler *before* the controller plugins. Each
// `app.register(...)` creates a child scope that inherits the parent's
// error handler at registration time — setting `setErrorHandler` after
// the plugins would only override the root scope, leaving the controller
// scopes with Fastify's default `{statusCode, error, message}` body.
app.setErrorHandler(middleware.errorHandler);

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
