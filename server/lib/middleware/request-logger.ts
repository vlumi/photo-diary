/* istanbul ignore file */
import type { Request } from "express";
import morgan from "morgan";

morgan.token<Request>("userId", (request) => request.user?.id ?? "");

// `:localtime` matches the format used by lib/logger.ts ([YYYY-MM-DD
// HH:MM:SS.mmm] in local time) so request lines interleave cleanly with the
// rest of the log file. morgan's built-in `:date[iso]` would work but uses
// UTC, which is annoying to correlate against the logger's local-time lines.
morgan.token("localtime", () => {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  );
});

// `:remote-addr` resolves through `req.ip`, which respects `trust proxy`.
// When nginx is in front and forwards `X-Forwarded-For`, this is the real
// client IP; otherwise it falls back to the socket address (127.0.0.1 in
// the typical reverse-proxy case). Also tells operators what address the
// per-IP rate-limiter is keying off — if every line shows 127.0.0.1,
// the nginx vhost is missing the `proxy_set_header X-Forwarded-For …` line.
export default morgan(
  "[:localtime] :remote-addr :method :url :status :res[content-length] - :response-time ms :userId"
);
