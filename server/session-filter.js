const CONST = require("./constants");

module.exports = (app, db, handleError) => {
  const sessionManager = require("./manager/session")(db);

  const attachSession = (request, response, next) => {
    const token = request.cookies["token"];
    if (CONST.DEBUG) console.log("In session filter", token);
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
