const CONST = require("./constants");

module.exports = (app, dao, handleError) => {
  const attachSession = (request, response, next) => {
    const token = request.cookies["token"];
    const initGuestSession = () =>
      (request.session = {
        username: "guest",
        created: undefined,
        updated: undefined,
      });
    if (token) {
      dao.verifySession(
        token,
        (session) => {
          request.session = session;
          next();
        },
        (error) => {
          initGuestSession();
          response.clearCookie("token");
          dao.revokeSession(
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

  return () => {};
};
