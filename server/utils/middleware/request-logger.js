const morgan = require("morgan");

morgan.token("username", function (request) {
  if ("session" in request && "username" in request.session) {
    return request.session.username;
  } else {
    return "";
  }
});

module.exports = morgan(
  ":method :url :status :res[content-length] - :response-time ms :username"
);
