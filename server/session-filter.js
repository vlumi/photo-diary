const CONST = require("./constants");

module.exports = (app, db, handleError) => {
  const sessionManager = require("./manager/session")(db);

  const attachSession = (request, response, next) => {
    const token = request.cookies["token"];
    const initGuestSession = () =>
      (request.session = {
        username: "guest",
        created: undefined,
        updated: undefined,
      });
    if (token) {
      sessionManager.verifySession(
        token,
        (session) => {
          request.session = session;
          next();
        },
        (error) => {
          initGuestSession();
          response.clearCookie("token");
          sessionManager.revokeSession(
            token,
            () => {
              // TODO: notify expiry
              next();
            },
            (error) => {
              // TODO: notify expiry
              next();
            }
          );
        }
      );
    } else {
      initGuestSession();
      next();
    }
  };
  app.use(attachSession);
};
