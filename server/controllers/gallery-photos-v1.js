import express from "express";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/gallery-photo.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};
const router = express.Router();

export default { init, router };

/**
 * Get all photos in the gallery.
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
