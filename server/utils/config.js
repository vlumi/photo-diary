require("dotenv").config();

const CONST = require("./constants");

const DEBUG = process.env.DEBUG || CONST.DEBUG;
const PORT = process.env.PORT || CONST.DEFAULT_PORT;

const DB_DRIVER = process.env.DB_DRIVER;
const DB_OPTS = process.env.DB_OPTS;

module.exports = {
  DEBUG,
  PORT,

  DB_DRIVER,
  DB_OPTS,
};
