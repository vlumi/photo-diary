import express from "express";

import authorizerClass from "../lib/authorizer.js";
import modelClass from "../models/gallery-photo.js";

const router = express.Router();

const authorizer = authorizerClass();
const model = modelClass();

const init = async () => {
  await model.init();
};

export default {
  init,
  router,
};

/**
 * Get the properties of a photo in gallery context.
 */
router.get("/:galleryId/", async (request, response) => {
  await authorizer.authorizeGalleryView(
    request.user.id,
    request.params.galleryId
  );
  const photo = await model.getGalleryPhotos(request.params.galleryId);
  response.json(photo);
});
/**
 * Get the properties of a photo in gallery context.
 */
router.get("/:galleryId/:photoId", async (request, response) => {
  await authorizer.authorizeGalleryView(
    request.user.id,
    request.params.galleryId
  );
  const photo = await model.getGalleryPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.json(photo);
});
/**
 * Link a photo to a gallery.
 */
router.put("/:galleryId/:photoId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.id,
    request.params.galleryId
  );
  await model.linkGalleryPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.status(204).end();
});
/**
 * Unlink a photo from a gallery.
 */
router.delete("/:galleryId/:photoId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.id,
    request.params.galleryId
  );
  await model.unlinkGalleryPhoto(
    request.params.galleryId,
    request.params.photoId
  );
  response.status(204).end();
});
