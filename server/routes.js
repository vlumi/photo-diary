const CONST = require("./constants");

module.exports = (app, dao) => {
  registerAuth(app, dao);
  registerStats(app, dao);
  registerGalleries(app, dao);
  registerPhotos(app, dao);
  registerGalleryPhotos(app, dao);

  app.use((request, response) => {
    response.status(404).send({ error: CONST.ERROR_NOT_FOUND });
  });
  app.use(function (error, request, response, next) {
    console.error(error);
    switch (error) {
      case CONST.ERROR_NOT_IMPLEMENTED:
      case CONST.ERROR_NOT_FOUND:
        response.status(501).send(error);
        break;
      default:
        response.status(500).send(`Error: ${error}`);
    }
  });
};

const registerAuth = (app, dao) => {
  app.post("/api/login", (request, response) => {
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
  app.delete("/api/logout", (request, response) => {
    const encodedToken = request.cookies["token"];
    const token = new Buffer(encodedToken, "base64").toString("ascii");
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
  app.post("/api/revoke-all", (request, response) => {
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
const registerStats = (app, dao) => {
  app.get("/api/stats", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.getStatistics(
      (stats) => response.json(stats),
      (error) => handleError(response, error)
    );
  });
  app.get("/api/stats/:galleryId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.getGalleryStatistics(
      request.params.galleryId,
      (stats) => response.json(stats),
      (error) => handleError(response, error)
    );
  });
};
const registerGalleries = (app, dao) => {
  app.get("/api/galleries", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.getAllGalleries(
      (galleries) => response.json(galleries),
      (error) => handleError(response, error)
    );
  });
  app.post("/api/galleries", (request, response) => {
    // TODO: get session
    // TODO: authorize
    // TODO: validate and set content from request.body
    const gallery = {};
    response.json(dao.createGallery(gallery));
  });
  app.get("/api/galleries/:galleryId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.getGallery(
      request.params.galleryId,
      (data) => response.json(data),
      (error) => handleError(response, error)
    );
  });
  app.put("/api/galleries/:galleryId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    // TODO: validate and set content from request.body
    const gallery = {};
    response.json(dao.updateGallery(gallery));
  });
  app.delete("/api/galleries/:galleryId", (request, response) => {
    dao.deleteGallery(request.params.galleryId);
    response.status(204).end();
  });
};
const registerPhotos = (app, dao) => {
  app.get("/api/photos/", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.getAllPhotos(
      (photos) => response.json(photos),
      (error) => handleerroor(response, error)
    );
  });
  app.post("/api/photos/", (request, response) => {
    // TODO: get session
    // TODO: authorize
    // TODO: validate and set content from request.body
    const photo = {};
    response.json(dao.createPhoto(photo));
  });
  app.get("/api/photos/:photoId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.getPhoto(
      request.params.photoId,
      (photo) => response.json(photo),
      (error) => handleError(response, error)
    );
  });
  app.put("/api/photos/:photoId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    // TODO: implement: update photo meta
    response.status(501).end();
  });
  app.delete("/api/photos/:photoId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.deletePhoto(request.params.galleryId);
    response.status(204).end();
  });
};
const registerGalleryPhotos = (app, dao) => {
  app.post("/api/galleries/:galleryId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    // TODO: validate and set content from request.body
    const photo = {};
    dao.linkPhoto(photo, gallery);
    response.status(204).end();
  });
  app.delete("/api/galleries/:galleryId/:photoId", (request, response) => {
    // TODO: get session
    // TODO: authorize
    dao.unlinkPhoto(photo, gallery);
    response.status(204).end();
  });
};
const handleError = (response, error, code = 500) => {
  console.log(error);
  response.status(code).json({ error: `Error: ${error}` });
};
