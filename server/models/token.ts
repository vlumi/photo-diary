import { SignJWT, jwtVerify, decodeJwt, errors as joseErrors } from "jose";
import bcrypt from "bcrypt";

import config from "../lib/config/index.js";
import CONST from "../lib/constants.js";
import {
  LoginError,
  NotImplementedError,
  TokenExpiredError,
} from "../lib/errors.js";
import logger from "../lib/logger.js";
import db from "../db/index.js";

const encodeSecret = (secret: string): Uint8Array =>
  new TextEncoder().encode(secret);

const secrets: Record<string, string> = {};
let reloadTimer: NodeJS.Timeout | undefined = undefined;

const loadSecrets = async (): Promise<void> => {
  logger.debug("Loading secrets");
  const users = (await db.loadUsers()) as Array<{ id: string; secret: string }>;
  users.forEach((user) => (secrets[user.id] = user.secret));
  logger.debug("Loading secrets done");
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

const revokeToken = async (_userId: string): Promise<void> => {
  throw new NotImplementedError();
};

// Called by `user.changePassword` after rotating the DB-side secret so the
// in-memory cache used for signing/verifying is in sync before the cache's
// 5-second reload window. Without this, the freshly-issued JWT for the
// just-changed-password user would be signed with the stale cached secret
// and fail verification on the very next request.
const setSecret = (userId: string, secret: string): void => {
  secrets[userId] = secret;
};

export default () => {
  return {
    init,
    authenticateUser,
    createToken,
    verifyToken,
    revokeToken,
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
const createToken = async (id: string, isAdmin: boolean): Promise<string> => {
  const tokenContent = { id, isAdmin };
  // `setExpirationTime` accepts a number-of-seconds or a relative duration
  // string. Using seconds (a Date `+ duration / 1000`) keeps the math
  // explicit and matches the `iat` units jose uses.
  const expSeconds = Math.floor((Date.now() + CONST.SESSION_LENGTH_MS) / 1000);
  return await new SignJWT(tokenContent)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(encodeSecret(getSecret(id)));
};
const authenticateUser = async (credentials: Credentials): Promise<void> => {
  logger.debug(`Authenticating user "${credentials.id}"`);
  try {
    const user = (await db.loadUser(credentials.id)) as StoredUser;
    await checkUserPassword(credentials, user);
    // Make sure the secret is up-to-date
    secrets[user.id] = user.secret;
  } catch {
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
