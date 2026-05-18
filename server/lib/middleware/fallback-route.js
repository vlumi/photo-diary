import CONST from "../constants.js";

export default (request, response) => {
  response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
};
