/* istanbul ignore file */
import type { onResponseHookHandler } from "fastify";

// Fastify's built-in pino logger emits its own per-request lines, but the
// shape doesn't include the resolved `userId` and isn't tunable enough to
// match what operators are used to grepping for. We disable the built-in
// completion log via `disableRequestLogging: true` in the Fastify constructor
// and emit this single line per response instead — same fields the morgan
// format used to surface, just structured.
//
// `request.ip` respects `trustProxy: 1`, so behind the nginx config in the
// README it's the real client IP; otherwise it's the socket address.
const requestLogger: onResponseHookHandler = async (request, reply) => {
  request.log.info(
    {
      ip: request.ip,
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      responseTime: Math.round(reply.elapsedTime),
      userId: request.user?.id ?? "",
    },
    "request"
  );
};

export default requestLogger;
