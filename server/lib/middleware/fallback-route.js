import CONST from "../constants.cjs";

export default (request, response) => {
  response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
};
