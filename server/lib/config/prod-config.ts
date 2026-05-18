import "dotenv/config";

import CONST from "../constants.js";

const DEBUG = process.env.DEBUG || CONST.DEFAULT_DEBUG;
const DB_DRIVER = process.env.DB_DRIVER;
const DB_OPTS = process.env.DB_OPTS;

export default { DEBUG, DB_DRIVER, DB_OPTS };
