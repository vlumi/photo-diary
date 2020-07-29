require("dotenv").config();

const CONST = require("../constants");

const DEBUG = process.env.DEBUG || CONST.DEFAULT_DEBUG;
const DB_DRIVER = process.env.DB_DRIVER;
const DB_OPTS = process.env.DB_OPTS;

module.exports = {
  DEBUG,
  DB_DRIVER,
  DB_OPTS,
};
