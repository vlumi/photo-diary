const bcrypt = require("bcrypt");

const logger = require("../utils/logger");

process.argv.slice(2).forEach((pair) => {
  const [password, hash] = pair.split("=");
  bcrypt.compare(password, hash, (err, result) => {
    logger.info(`Password "${password}" matches ${hash}? ${err} ${result}`);
  });
});
