const CONST = require("../constants.cjs");

module.exports = (request, response) => {
  response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
};
