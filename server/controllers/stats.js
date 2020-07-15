const authManager = require("../utils/authorizer")();
const model = require("../models/statistics")();

const init = async () => {
  await model.init();
};
const router = require("express").Router();

module.exports = {
  init,
  router,
};

router.get("/", async (request, response) => {
  await authManager.authorizeView(request.user.username);
  const stats = await model.getStatistics();
  response.json(stats);
});
router.get("/:galleryId", async (request, response) => {
  await authManager.authorizeGalleryView(
    request.user.username,
    request.params.galleryId
  );
  const stats = await model.getGalleryStatistics(request.params.galleryId);
  response.json(stats);
});
