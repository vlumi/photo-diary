require("dotenv").config();

const CONST = require("../constants");

const DEBUG = false;
const PORT = process.env.PORT || CONST.DEFAULT_PORT;
const SECRET = process.env.SECRET;

const DB_DRIVER = "dummy";
const DB_OPTS = undefined;

module.exports = {
  DEBUG,
  PORT,
  SECRET,

  DB_DRIVER,
  DB_OPTS,
};
