const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const logger = require("../utils/logger");
const db = require("../db");

const saltRounds = 10;

if (process.argv.length < 4) {
  logger.error("Usage: node bin/add-user.js [userId] [password]");
  process.exit();
}
const [userId, password] = process.argv.slice(2);

bcrypt.hash(password, saltRounds, async (err, hash) => {
  db.loadUser(userId)
    .then(async (user) => {
      db.updateUser(user.id, { password: hash, secret: uuidv4() }).catch(
        (error) => {
          logger.error("Failed:", error);
        }
      );
      logger.info(`Existing user "${userId}" found and updated.`);
    })
    .catch(async () => {
      db.createUser({ id: userId, password: hash, secret: uuidv4() }).catch(
        (error) => {
          logger.error("Failed:", error);
        }
      );
      logger.info(`New user "${userId}" created.`);
    });
});
