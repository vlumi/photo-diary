require("dotenv").config();

const CONST = require("../constants");

const ENV = process.env.NODE_ENV || CONST.DEFAULT_ENV;

const PHOTO_ROOT_DIR = process.env.PHOTO_ROOT_DIR;
const PORT = process.env.PORT || CONST.DEFAULT_PORT;
const SECRET = process.env.SECRET;
if (!SECRET) {
  throw "SECRET must be defined.";
}

const values = require(`./${ENV}-config`);

module.exports = {
  ENV,
  PHOTO_ROOT_DIR,
  PORT,
  SECRET,
  ...values,
};
