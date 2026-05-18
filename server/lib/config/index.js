/* istanbul ignore file */
import "dotenv/config";

import CONST from "../constants.js";
import devConfig from "./dev-config.js";
import prodConfig from "./prod-config.js";
import testConfig from "./test-config.js";

const ENV = process.env.NODE_ENV || CONST.DEFAULT_ENV;

const PHOTO_ROOT_DIR = process.env.PHOTO_ROOT_DIR;
const PORT = process.env.PORT || CONST.DEFAULT_PORT;
const SECRET = process.env.SECRET;
if (!SECRET) {
  throw "SECRET must be defined.";
}

const configs = { dev: devConfig, prod: prodConfig, test: testConfig };
const values = configs[ENV];

export default {
  ENV,
  PHOTO_ROOT_DIR,
  PORT,
  SECRET,
  ...values,
};
