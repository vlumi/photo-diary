/* istanbul ignore file */
import morgan from "morgan";

morgan.token("userId", function (request) {
  if ("user" in request && "id" in request.user) {
    return request.user.id;
  } else {
    return "";
  }
});

export default morgan(
  ":method :url :status :res[content-length] - :response-time ms :userId"
);
