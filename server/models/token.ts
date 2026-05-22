import { SignJWT, jwtVerify, decodeJwt } from "jose";
import bcrypt from "bcrypt";

import CONST from "../lib/constants.js";
import config from "../lib/config/index.js";
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
  throw CONST.ERROR_NOT_IMPLEMENTED;
};

export default () => {
  return {
    init,
    authenticateUser,
    createToken,
    verifyToken,
    revokeToken,
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
        reject(CONST.ERROR_LOGIN);
      }
      logger.debug(`Password check succeeded for "${credentials.id}"`);
      resolve();
    });
  });
};
const createToken = async (id: string, isAdmin: boolean): Promise<string> => {
  const tokenContent = { id, isAdmin };
  // TODO: expiration
  return await new SignJWT(tokenContent)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
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
    throw CONST.ERROR_LOGIN;
  }
};
const verifyToken = async (token: string) => {
  const decoded = decodeJwt(token) as { id: string };
  logger.debug(`Verifying token for "${decoded.id}"`);

  const { payload } = await jwtVerify(
    token,
    encodeSecret(getSecret(decoded.id))
  );
  if (!payload || payload.id !== decoded.id) {
    throw CONST.ERROR_LOGIN;
  }
  return payload as { id: string; isAdmin?: boolean };
};
