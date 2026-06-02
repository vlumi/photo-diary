const DEFAULT_ENV = "prod";
const DEFAULT_DEBUG = false;

const DEFAULT_PORT = 4200;
// Access JWT lifetime: 15 minutes. Short enough that a stolen token has
// limited blast radius; long enough that a busy session doesn't refresh
// constantly.
const ACCESS_TOKEN_LIFETIME_MS = 1000 * 60 * 15;
// Session/refresh-token sliding window: 90 days of inactivity before the
// session expires. Each successful refresh resets the timer.
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 90;

const API_ROOT = "/api";
const GUEST_USER = ":guest";

const STATS_UNKNOWN = "[unknown]";

export default {
  DEFAULT_ENV,
  DEFAULT_DEBUG,

  DEFAULT_PORT,
  ACCESS_TOKEN_LIFETIME_MS,
  SESSION_LENGTH_MS,

  API_ROOT,
  GUEST_USER,

  STATS_UNKNOWN,
};
