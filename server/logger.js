const morgan = require("morgan");

module.exports = (app) => {
  morgan.token("username", function (request) {
    if ("session" in request && "username" in request.session) {
      return request.session.username;
    } else {
      return "";
    }
  });
  app.use(
    morgan(
      ":method :url :status :res[content-length] - :response-time ms :username"
    )
  );
};
