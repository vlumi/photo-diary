const router = require("express").Router();
module.exports = router;

const authManager = require("../utils/authorizer")();
const statsModel = require("../models/stats")();

router.get("/", (request, response, next) => {
  authManager
    .authorizeView(request.session.username)
    .then(() => {
      statsModel
        .getStatistics()
        .then((stats) => response.json(stats))
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
router.get("/:galleryId", (request, response, next) => {
  authManager
    .authorizeGalleryView(request.session.username, request.params.galleryId)
    .then(() => {
      statsModel
        .getGalleryStatistics(request.params.galleryId)
        .then((stats) => response.json(stats))
        .catch((error) => next(error));
    })
    .catch((error) => next(error));
});
