require("dotenv").config();

const CONST = require("../constants");

const DEBUG = process.env.DEBUG || CONST.DEFAULT_DEBUG;
const PORT = process.env.PORT || CONST.DEFAULT_PORT;
const SECRET = process.env.SECRET;

const DB_DRIVER = process.env.DB_DRIVER;
const DB_OPTS = process.env.DB_OPTS;

module.exports = {
  DEBUG,
  PORT,
  SECRET,

  DB_DRIVER,
  DB_OPTS,
};
