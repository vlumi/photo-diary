import { SignJWT, jwtVerify, decodeJwt } from "jose";
import bcrypt from "bcrypt";

import CONST from "../lib/constants.js";
import config from "../lib/config/index.js";
import logger from "../lib/logger.js";
import db from "../db/index.js";

const encodeSecret = (secret) => new TextEncoder().encode(secret);

const secrets = {};
let reloadTimer = undefined;

const loadSecrets = async () => {
  logger.debug("Loading secrets");
  const users = await db.loadUsers();
  users.forEach((user) => (secrets[user.id] = user.secret));
  logger.debug("Loading secrets done");
};

const getSecret = (userId) => {
  if (!(userId in secrets)) {
    return config.SECRET;
  }
  return `${secrets[userId]}${config.SECRET}`;
};

const init = async () => {
  await loadSecrets();
  if (reloadTimer) clearTimeout(reloadTimer);
  // Reload every minute or so. unref() so the timer doesn't keep the
  // event loop alive on its own (matters in tests).
  reloadTimer = setTimeout(async () => await init(), 60000);
  reloadTimer.unref();
};

export default () => {
  return {
    init,
    authenticateUser,
    createToken,
    verifyToken,
  };
};

const checkUserPassword = async (credentials, user) => {
  logger.debug("Check password", credentials, user);
  return new Promise((resolve, reject) => {
    bcrypt.compare(credentials.password, user.password, (error, result) => {
      if (error || !result) {
        logger.debug("Invalid password", credentials);
        reject(CONST.ERROR_LOGIN);
      }
      logger.debug("success!", error, result);
      resolve();
    });
  });
};
const createToken = async (id, isAdmin) => {
  const tokenContent = { id, isAdmin };
  // TODO: expiration
  return await new SignJWT(tokenContent)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(encodeSecret(getSecret(id)));
};
const authenticateUser = async (credentials) => {
  logger.debug("Authenticating user", credentials);
  try {
    const user = await db.loadUser(credentials.id);
    await checkUserPassword(credentials, user);
    // Make sure the secret is up-to-date
    secrets[user.id] = user.secret;
  } catch (error) {
    throw CONST.ERROR_LOGIN;
  }
};
const verifyToken = async (token) => {
  const decoded = decodeJwt(token);
  logger.debug("Verifying token", token, secrets[decoded.id]);

  const { payload } = await jwtVerify(token, encodeSecret(getSecret(decoded.id)));
  if (!payload || payload.id !== decoded.id) {
    throw CONST.ERROR_LOGIN;
  }
  return payload;
};
