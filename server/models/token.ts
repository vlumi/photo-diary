import { SignJWT, jwtVerify, decodeJwt, errors as joseErrors } from "jose";
import bcrypt from "bcrypt";
import { randomUUID, randomBytes } from "node:crypto";

import config from "../lib/config/index.js";
import CONST from "../lib/constants.js";
import {
  InvalidTokenError,
  LoginError,
  TokenExpiredError,
} from "../lib/errors.js";
import { SALT_ROUNDS } from "../lib/bcrypt-rounds.js";
import logger from "../lib/logger.js";
import db from "../db/index.js";

const REFRESH_SECRET_BYTES = 32;

const encodeSecret = (secret: string): Uint8Array =>
  new TextEncoder().encode(secret);

const secrets: Record<string, string> = {};
let reloadTimer: NodeJS.Timeout | undefined = undefined;

const loadSecrets = async (): Promise<void> => {
  logger.debug("Loading secrets");
  const users = (await db.loadUsers()) as Array<{ id: string; secret: string }>;
  // Clear before reloading: a `bin/user.ts delete` (or a test wiping the
  // user table) removes the row, but a stale in-memory entry would still
  // let tokens signed under the old secret verify until process restart.
  for (const key of Object.keys(secrets)) delete secrets[key];
  users.forEach((user) => (secrets[user.id] = user.secret));
  logger.debug("Loading secrets done");
};

// Test-only: clear the in-memory secrets cache + cancel the reload
// timer so the next file's seed starts from a known empty state.
export const _resetTokenStateForTests = (): void => {
  for (const key of Object.keys(secrets)) delete secrets[key];
  if (reloadTimer) {
    clearTimeout(reloadTimer);
    reloadTimer = undefined;
  }
};

const getSecret = (userId: string): string => {
  if (!(userId in secrets)) {
    return config.SECRET as string;
  }
  return `${secrets[userId]}${config.SECRET}`;
};

const init = async (): Promise<void> => {
  await loadSecrets();
  if (reloadTimer) clearTimeout(reloadTimer);
  // 5-second reload so a `bin/user.ts passwd` rotation (which kills sessions
  // by rotating the user's `secret`) takes effect quickly. The DB read is one
  // indexed SELECT against a small table; trivial cost. unref() so the timer
  // doesn't keep the event loop alive on its own (matters in tests).
  reloadTimer = setTimeout(() => {
    init().catch(() => {});
  }, 5000);
  reloadTimer.unref();
};

type Credentials = { id: string; password: string };
type StoredUser = { id: string; password: string; secret: string };
type TokenPair = { accessToken: string; refreshToken: string };

// Refresh tokens are sent to the client as `<sessionId>.<secret>`. The
// session row stores `sessionId` directly and the bcrypt hash of the
// secret — same shape as the user's password check. Lookup by sessionId,
// verify the secret with bcrypt, rotate on every refresh so a stolen
// refresh token only works once (the legitimate client's next refresh
// then fails too, flagging the breach).
const generateRefreshTokenParts = () => {
  const sessionId = randomUUID();
  const secret = randomBytes(REFRESH_SECRET_BYTES).toString("base64url");
  return { sessionId, secret, combined: `${sessionId}.${secret}` };
};
const parseRefreshToken = (
  combined: string
): { sessionId: string; secret: string } | undefined => {
  const idx = combined.indexOf(".");
  if (idx <= 0 || idx >= combined.length - 1) return undefined;
  return {
    sessionId: combined.slice(0, idx),
    secret: combined.slice(idx + 1),
  };
};

const signAccessToken = async (
  id: string,
  isAdmin: boolean
): Promise<string> => {
  // `setExpirationTime` accepts a number-of-seconds or a relative duration
  // string. Using seconds (a Date `+ duration / 1000`) keeps the math
  // explicit and matches the `iat` units jose uses.
  const expSeconds = Math.floor(
    (Date.now() + CONST.ACCESS_TOKEN_LIFETIME_MS) / 1000
  );
  return await new SignJWT({ id, isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(encodeSecret(getSecret(id)));
};

const createSession = async (
  id: string,
  isAdmin: boolean
): Promise<TokenPair> => {
  const { sessionId, secret, combined } = generateRefreshTokenParts();
  const hash = await bcrypt.hash(secret, SALT_ROUNDS);
  const now = Date.now();
  await db.createSession({
    id: sessionId,
    user_id: id,
    refresh_token_hash: hash,
    created_at: now,
    last_used_at: now,
  });
  const accessToken = await signAccessToken(id, isAdmin);
  return { accessToken, refreshToken: combined };
};

// Validate the refresh token + rotate it. Caller is responsible for
// re-deriving `isAdmin` (via authorizer) and signing the new access token.
// Returning just `userId` keeps this model agnostic of the access cascade.
const verifyAndRotateRefresh = async (
  refreshToken: string
): Promise<{ userId: string; refreshToken: string }> => {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) throw new InvalidTokenError();
  const row = await db.loadSession(parsed.sessionId);
  if (!row) throw new InvalidTokenError();
  // Sliding-window expiry: idle longer than SESSION_LENGTH_MS → expired.
  if (Date.now() - row.last_used_at > CONST.SESSION_LENGTH_MS) {
    await db.deleteSession(parsed.sessionId);
    throw new TokenExpiredError();
  }
  const ok = await bcrypt.compare(parsed.secret, row.refresh_token_hash);
  if (!ok) throw new InvalidTokenError();
  // Rotate: generate a new secret, replace the hash, and update
  // last_used_at. Atomic check-and-swap: the DB UPDATE only lands
  // if the row's hash is still what we compared against — if a
  // concurrent refresh call (typically a sibling tab) already
  // rotated, we lose the race and throw. The client retries the
  // original request; the browser's cookie jar has the winner's
  // fresh tokens by then, so the retry succeeds.
  const newSecret = randomBytes(REFRESH_SECRET_BYTES).toString("base64url");
  const newHash = await bcrypt.hash(newSecret, SALT_ROUNDS);
  const won = await db.rotateSessionHash(
    parsed.sessionId,
    row.refresh_token_hash,
    newHash,
    Date.now()
  );
  if (!won) throw new InvalidTokenError();
  return {
    userId: row.user_id,
    refreshToken: `${parsed.sessionId}.${newSecret}`,
  };
};

// Logout: delete the session row. Idempotent — silently no-ops on a
// missing or malformed token so the client's "log out anyway" flow
// never throws.
const revokeSession = async (refreshToken: string): Promise<void> => {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) return;
  await db.deleteSession(parsed.sessionId);
};

const revokeAllSessions = async (userId: string): Promise<void> => {
  await db.deleteUserSessions(userId);
};

// Sync the in-memory secret cache after a password rotation so the
// freshly-signed JWT verifies on the very next request (instead of
// failing for up to the 5s cache reload window).
const setSecret = (userId: string, secret: string): void => {
  secrets[userId] = secret;
};

export default () => {
  return {
    init,
    authenticateUser,
    createSession,
    signAccessToken,
    verifyAndRotateRefresh,
    verifyToken,
    revokeSession,
    revokeAllSessions,
    setSecret,
  };
};

const checkUserPassword = async (
  credentials: Credentials,
  user: StoredUser
): Promise<void> => {
  logger.debug(`Check password for "${credentials.id}"`);
  return new Promise((resolve, reject) => {
    bcrypt.compare(credentials.password, user.password, (error, result) => {
      if (error || !result) {
        logger.debug(`Invalid password for "${credentials.id}"`);
        reject(new LoginError());
      }
      logger.debug(`Password check succeeded for "${credentials.id}"`);
      resolve();
    });
  });
};
const authenticateUser = async (credentials: Credentials): Promise<void> => {
  logger.debug(`Authenticating user "${credentials.id}"`);
  try {
    const user = (await db.loadUser(credentials.id)) as StoredUser;
    await checkUserPassword(credentials, user);
    // Make sure the secret is up-to-date
    secrets[user.id] = user.secret;
  } catch (error) {
    // Log the underlying cause before normalising to LoginError —
    // the public response intentionally hides whether the failure
    // was bad-password / unknown-user / DB outage (timing attacks),
    // but the operator needs to see DB issues in the log.
    logger.error({ err: error, id: credentials.id }, "authenticateUser failed");
    throw new LoginError();
  }
};
const verifyToken = async (token: string) => {
  const decoded = decodeJwt(token) as { id: string };
  logger.debug(`Verifying token for "${decoded.id}"`);

  try {
    const { payload } = await jwtVerify(
      token,
      encodeSecret(getSecret(decoded.id))
    );
    if (!payload || payload.id !== decoded.id) {
      throw new LoginError();
    }
    return payload as { id: string; isAdmin?: boolean };
  } catch (error) {
    // Re-throw expiration as the typed error the frontend switches on so a
    // mid-session expiry surfaces the re-login modal rather than the generic
    // "invalid token" path. Everything else (signature mismatch, malformed,
    // tampered) keeps falling through as a generic verification failure.
    if (error instanceof joseErrors.JWTExpired) {
      throw new TokenExpiredError();
    }
    throw error;
  }
};
