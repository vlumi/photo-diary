const morgan = require("morgan");

morgan.token("userId", function (request) {
  if ("user" in request && "id" in request.user) {
    return request.user.id;
  } else {
    return "";
  }
});

module.exports = morgan(
  ":method :url :status :res[content-length] - :response-time ms :userId"
);
