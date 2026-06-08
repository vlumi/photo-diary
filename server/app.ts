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
import userGalleryV1 from "./controllers/user-gallery-v1.js";
import groupsV1 from "./controllers/groups-v1.js";
import groupGalleryV1 from "./controllers/group-gallery-v1.js";
import statsV1 from "./controllers/stats-v1.js";

import middleware from "./lib/middleware/index.js";
import { NotFoundError } from "./lib/errors.js";
import logger from "./lib/logger.js";
import { isSpaRoute } from "./lib/spa-routes.js";

export const app = Fastify({
  trustProxy: 1,
  // Match the lenient trailing-slash behaviour the SPA's client URLs
  // were built against.
  routerOptions: { ignoreTrailingSlash: true },
  // Fastify defaults to `removeAdditional: 'all'`, which silently
  // strips properties not in the schema. We want the opposite —
  // routes that opt in to `additionalProperties: false` (the photo
  // mutation endpoints, which lock writes to operator-controlled
  // fields) reject unknown writes with 400 instead of accepting +
  // dropping them. Routes that need pass-through still declare
  // `additionalProperties: true` explicitly.
  ajv: { customOptions: { removeAdditional: false } },
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
  // `requestLogger` (below) emits the structured per-response line.
  disableRequestLogging: true,
}).withTypeProvider<TypeBoxTypeProvider>();

const STATIC_DIR =
  process.env.STATIC_DIR ?? path.join(import.meta.dirname, "build");

// Server's own `package.json` for the OpenAPI `info.version`.
const pkg = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "package.json"), "utf8")
) as { version: string };

// Must register before the controller plugins so it captures every
// route's schema as it's added.
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
      { name: "groups", description: "User groups (admin)" },
      {
        name: "group-gallery",
        description: "Group-level gallery grants (admin)",
      },
      { name: "stats", description: "Aggregated gallery stats" },
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

// Swagger UI: always in dev, gated by `ENABLE_DOCS=true` elsewhere.
// Operators wanting the spec for codegen can `npm run docs:dump`.
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

// CSP is off because the default would break the SPA's inline
// styles / dynamic imports (warrants its own audit). Referrer-
// Policy overridden because OSM's tile servers block referrer-less
// requests as bot traffic, breaking the Leaflet map widget.
await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
await app.register(fastifyCompress);

// Discourage indexing / AI scraping on every response — robots.txt
// only covers HTML, X-Robots-Tag covers photo files too.
app.addHook("onSend", async (_request, reply) => {
  reply.header("X-Robots-Tag", "noindex, noai, noimageai");
});

// Resolve the bundled frontend relative to this source file so
// multi-instance deploys (invoked from a per-instance CWD) still
// find it. `STATIC_DIR` overrides.
await app.register(fastifyStatic, {
  root: STATIC_DIR,
  prefix: "/",
});

app.addHook("onRequest", middleware.tokenFilter);
app.addHook("onRequest", middleware.hostScopeFilter);
/* istanbul ignore next */
if (config.ENV !== "test") {
  app.addHook("onResponse", middleware.requestLogger);
}

// Must be before the controller plugins — child scopes inherit
// the parent's error handler at registration time.
app.setErrorHandler(middleware.errorHandler);

await app.register(metaV1.plugin, { prefix: "/api/v1/meta" });
await app.register(tokensV1.plugin, { prefix: "/api/v1/tokens" });
await app.register(usersV1.plugin, { prefix: "/api/v1/users" });
await app.register(galleriesV1.plugin, { prefix: "/api/v1/galleries" });
await app.register(photosV1.plugin, { prefix: "/api/v1/photos" });
await app.register(galleryPhotosV1.plugin, {
  prefix: "/api/v1/gallery-photos",
});
await app.register(userGalleryV1.plugin, {
  prefix: "/api/v1/user-gallery",
});
await app.register(groupsV1.plugin, { prefix: "/api/v1/groups" });
await app.register(groupGalleryV1.plugin, {
  prefix: "/api/v1/group-gallery",
});
await app.register(statsV1.plugin, { prefix: "/api/v1/galleries" });

// Double-duty 404 handler: serve index.html for SPA routes so
// React Router can resolve deep links (refreshing /m/photos, or
// pasting a /s/<gallery>/year URL into the bar, must not 404 at
// the server); everything else (incl. unknown `/api/*`) goes
// through `errorHandler` for the JSON 404 the API has always
// produced. SPA root list lives in lib/spa-routes.ts.
app.setNotFoundHandler(async (request, reply) => {
  const pathOnly = request.url.split("?")[0];
  if (isSpaRoute(pathOnly)) {
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
  await userGalleryV1.init();
  await groupsV1.init();
  await groupGalleryV1.init();
  await statsV1.init();
  await app.ready();
  logger.debug("Initialize app done");
};

export default { app, init };
