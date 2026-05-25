/* istanbul ignore file */
import type { onResponseHookHandler } from "fastify";

// Replaces Fastify's built-in completion log (disabled via
// `disableRequestLogging`) so we can include `userId` in the structured fields.
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
