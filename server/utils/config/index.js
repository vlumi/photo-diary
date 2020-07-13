require("dotenv").config();

const CONST = require("../constants");

const ENV = process.env.NODE_ENV || CONST.DEFAULT_ENV;
console.log("Loading configuration in ", ENV);

const values = require(`./${ENV}-config`);
if (!values.SECRET) {
  throw "SECRET must be defined.";
}

module.exports = {
  ENV,
  ...values,
};
