const authManager = require("../utils/authorizer")();
const statsModel = require("../models/stats")();

const init = async () => {
  await statsModel.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

router.get("/", async (request, response) => {
  await authManager.authorizeView(request.session.username);
  const stats = await statsModel.getStatistics();
  response.json(stats);
});
router.get("/:galleryId", async (request, response) => {
  await authManager.authorizeGalleryView(
    request.session.username,
    request.params.galleryId
  );
  const stats = await statsModel.getGalleryStatistics(request.params.galleryId);
  response.json(stats);
});
