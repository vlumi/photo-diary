import express from "express";

import CONST from "../lib/constants.js";
import authorizerFactory from "../lib/authorizer.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import modelFactory from "../models/photo.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};
const router = express.Router();

export default { init, router };

/**
 * Get all photos.
 */
router.get("/", async (request, response) => {
  await authorizer.authorizeView(request.user.id);
  const photos = await model.getPhotos();
  // No per-gallery scope here — resolve the user's :all-level preference.
  // `Object.values` covers both the array shape (real sqlite driver) and the
  // {photoId: photo} dict shape the dummy driver returns; either way we get
  // an iterable of photo objects that `maskCoordinates` can mutate in place.
  if (await shouldHideMap(request.user.id, CONST.SPECIAL_GALLERY_ALL)) {
    maskCoordinates(
      Object.values(photos as Record<string, unknown>) as Parameters<
        typeof maskCoordinates
      >[0]
    );
  }
  response.json(photos);
});
/**
 * Create a photo.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const photo = {};
  // TODO: validate and set content from request.body
  const createdPhoto = await model.createPhoto(photo);
  response.json(createdPhoto);
});
/**
 * Get the matching photo.
 */
router.get("/:photoId", async (request, response) => {
  await authorizer.authorizeView(request.user.id);
  const photo = await model.getPhoto(request.params.photoId);
  if (await shouldHideMap(request.user.id, CONST.SPECIAL_GALLERY_ALL)) {
    maskCoordinates([photo] as Parameters<typeof maskCoordinates>[0]);
  }
  response.json(photo);
});
/**
 * Update the matching photo.
 */
router.put("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const photo = {};
  // TODO: validate and set content from request.body
  const updatedPhoto = await model.updatePhoto(photo);
  response.json(updatedPhoto);
});
/**
 * Delete the matching photo.
 */
router.delete("/:photoId", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  await model.deletePhoto(request.params.photoId);
  response.status(204).end();
});
