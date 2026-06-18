import fs from "node:fs";
import path from "node:path";
import { Type } from "typebox";
import { type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

import authorizerFactory from "../lib/authorizer.js";
import { requireUnscoped } from "../lib/host-scope.js";
import db from "../db/index.js";

const authorizer = authorizerFactory();

const init = async () => {};

// Recursively count regular files under a directory. Returns 0 when
// the dir doesn't exist (a fresh instance hasn't seeded photos/yet).
// Hidden files starting with '.' are skipped — chokidar's lockfile
// dot-files mustn't inflate the pending count.
const countFiles = (dir: string): number => {
  let n = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        n += countFiles(full);
      } else if (entry.isFile()) {
        n += 1;
      }
    }
  } catch {
    return 0;
  }
  return n;
};

const OperationEventSchema = Type.Object({
  id: Type.Integer(),
  createdAt: Type.String(),
  photoId: Type.Union([Type.String(), Type.Null()]),
  action: Type.String(),
  status: Type.Union([
    Type.Literal("success"),
    Type.Literal("failure"),
    Type.Literal("skipped"),
  ]),
  detail: Type.Union([Type.String(), Type.Null()]),
});

const OperationsResponse = Type.Object({
  recent: Type.Array(OperationEventSchema),
  failures: Type.Array(OperationEventSchema),
  pending: Type.Object({
    intake: Type.Integer(),
    geocode: Type.Integer(),
  }),
});

const TAGS = ["operations"];

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  // Recent activity + pending counts + recent failures. Admin-only;
  // the converter's intake JSONs and coord sidecars are operator-
  // private and the operation-event log can name photo ids across
  // every gallery.
  fastify.get(
    "/",
    {
      schema: {
        tags: TAGS,
        summary:
          "Recent converter / operator-script activity, pending-queue counts, and recent failures",
        response: { 200: OperationsResponse },
        security: [{ bearer: [] }],
      },
    },
    async (request) => {
      requireUnscoped(request);
      await authorizer.authorizeAdmin(request.user.id);
      const [recent, failures, geocode] = await Promise.all([
        db.loadRecentOperations(100),
        db.loadOperationFailures(50),
        db.countPendingGeocode(),
      ]);
      const inbox = countFiles(path.join(process.cwd(), "photos", "inbox"));
      return {
        recent,
        failures,
        pending: { intake: inbox, geocode },
      };
    }
  );
};

export default { init, plugin };
