const CONST = require("../constants");

module.exports = (root, handleError) => {
  const endPoint = `${root}/session`;

  return (app, db) => {
    const sessionManager = require("../manager/session")(db);

    app.post(endPoint, (request, response) => {
      const credentials = {
        username: request.body.username,
        password: request.body.password,
      };
      if (!credentials.username || !credentials.password) {
        handleError(response, CONST.ERROR_LOGIN, 400);
        return;
      }
      sessionManager.authenticateUser(
        credentials,
        (session, token) => {
          if (CONST.DEBUG)
            console.log(
              `User "${credentials.username}" logged in successfully.`
            );

          request.session = session;
          const encodedToken = Buffer.from(token).toString("base64");
          // TODO: set cookie expiration
          response.cookie("token", encodedToken);
          response.status(204).end();
        },
        (error) => {
          handleError(response, error, 401);
        }
      );
    });
    app.delete(endPoint, (request, response) => {
      sessionManager.revokeSession(
        request.cookies["token"],
        () => {
          response.clearCookie("token");
          response.status(204).end();
        },
        (error) => {
          response.clearCookie("token");
          handleError(reponse, error);
        }
      );
    });
    app.post(endPoint + "/revoke-all", (request, response) => {
      const credentials = {
        username: request.body.username,
        password: request.body.password,
      };
      if (!credentials.username || !credentials.password) {
        handleError(response, CONST.ERROR_LOGIN, 400);
        return;
      }
      sessionManager.revokeAllSessions(
        credentials,
        () => {
          response.clearCookie("token");
          response.status(204).end();
        },
        (error) => {
          handleError(response, error, 401);
        }
      );
    });
  };
};
