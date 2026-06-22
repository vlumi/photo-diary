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
// Optional. When set + same across instances, the cross-host SSO
// flow (#664) is available — operator can hop between their
// hostnames from the UserMenu without re-logging in. Leave unset to
// disable: /api/v1/tokens/cross-host + /api/v1/tokens/sso both 503.
const SSO_SECRET = process.env.SSO_SECRET;

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
  SSO_SECRET,
  ...values,
};
