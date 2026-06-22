/* istanbul ignore file */
import "dotenv/config";

import CONST from "../constants.js";
import devConfig from "./dev-config.js";
import prodConfig from "./prod-config.js";
import testConfig from "./test-config.js";

const ENV = process.env.NODE_ENV || CONST.DEFAULT_ENV;

const PORT = process.env.PORT || CONST.DEFAULT_PORT;
const SECRET = process.env.SECRET;
if (!SECRET) {
  throw "SECRET must be defined.";
}

const configs = { dev: devConfig, prod: prodConfig, test: testConfig };
const isValidEnv = (e: string): e is keyof typeof configs => e in configs;
if (!isValidEnv(ENV)) {
  throw `Unknown NODE_ENV: ${ENV}`;
}
const values = configs[ENV];

export default {
  ENV,
  PORT,
  SECRET,
  ...values,
};
