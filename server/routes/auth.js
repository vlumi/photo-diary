module.exports = (root) => {
  const endPoint = `${root}/session`;
  return (app, dao) => {
    app.post(endPoint, (request, response) => {
      const credentials = {
        username: request.body.username,
        password: request.body.password,
      };
      if (!credentials.username || !credentials.password) {
        handleError(response, CONST.ERROR_LOGIN, 400);
        return;
      }
      dao.authenticateUser(
        credentials,
        (token) => {
          console.log(`User "${credentials.username}" logged in successfully.`);
          const encodedToken = Buffer.from(token).toString("base64");
          response.cookie("token", encodedToken);
          response.status(204).end();
        },
        (error) => {
          handleError(response, error, 401);
        }
      );
    });
    app.delete(endPoint, (request, response) => {
      const encodedToken = request.cookies["token"];
      const token = Buffer.from(encodedToken, "base64").toString("ascii");
      const [username, session] = token.split("=", 2);
      if (!username || !session) {
        response.clearCookie("token");
        response.status(204).end();
      }
      dao.revokeSession(
        username,
        session,
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
      dao.revokeAllSessions(
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
