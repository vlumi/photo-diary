const morgan = require("morgan");

morgan.token("username", function (request) {
  if ("user" in request && "username" in request.user) {
    return request.user.username;
  } else {
    return "";
  }
});

module.exports = morgan(
  ":method :url :status :res[content-length] - :response-time ms :username"
);
