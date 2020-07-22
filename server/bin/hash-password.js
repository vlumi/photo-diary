const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const logger = require("../utils/logger");

const saltRounds = 10;
process.argv.slice(2).forEach((password) => {
  bcrypt.hash(password, saltRounds, (err, hash) => {
    logger.info(
      `Hash for "${password}": [${hash}], random secret: [${uuidv4()}]`
    );
    bcrypt.compare(password, hash, (err, result) => {
      logger.info(`Password "${password}" matches ${hash}? ${err} ${result}`);
    });
  });
});
