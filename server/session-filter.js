const CONST = require("./constants");
const db = require("./db");

module.exports = (app) => {
  const sessionManager = require("./manager/session")(db);

  const attachSession = (request, response, next) => {
    const token = request.cookies["token"];
    const initGuestSession = () => {
      request.session = {
        username: "guest",
        created: undefined,
        updated: undefined,
      };
    };
    if (token) {
      sessionManager
        .verifySession(token)
        .then((session) => {
          console.log("session", session);
          request.session = session;
          next();
        })
        .catch((error) => {
          console.log("error", error);
          initGuestSession();
          response.clearCookie("token");
          sessionManager
            .revokeSession(token)
            .then(() => {
              // TODO: notify expiry
              next();
            })
            .catch((error) => {
              // TODO: notify expiry
              next();
            });
        });
    } else {
      initGuestSession();
      next();
    }
  };
  app.use(attachSession);
};
