import express from "express";

import authorizerFactory from "../lib/authorizer.js";
import modelFactory from "../models/gallery.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};
const router = express.Router();

export default { init, router };

/**
 * Get all galleries.
 */
router.get("/", async (request, response) => {
  const galleries = (await model.getGalleries()) as Array<{ id: string }>;

  try {
    await authorizer.authorizeAdmin(request.user.id);
    response.json(galleries);
  } catch {
    const galleryIds = galleries.map((gallery: { id: string }) => gallery.id);

    const authorizedPromises = await Promise.allSettled(
      galleryIds.map((galleryId) =>
        authorizer.authorizeGalleryView(request.user.id, galleryId)
      )
    );
    const authorizedGalleryIds = authorizedPromises
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const authorizedGalleries = galleries.filter((gallery: { id: string }) =>
      authorizedGalleryIds.includes(gallery.id)
    );
    response.json(authorizedGalleries);
  }
});
/**
 * Create a new gallery.
 */
router.post("/", async (request, response) => {
  await authorizer.authorizeAdmin(request.user.id);
  const gallery = {};
  // TODO: validate and set content from request.body
  const craetedGallery = await model.createGallery(gallery);
  response.json(craetedGallery);
});
/**
 * Get a single gallery, including its photos.
 */
router.get("/:galleryId", async (request, response) => {
  await authorizer.authorizeGalleryView(
    request.user.id,
    request.params.galleryId
  );
  const gallery = await model.getGallery(request.params.galleryId);
  response.json(gallery);
});
/**
 * Update gallery properties
 */
router.put("/:galleryId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.id,
    request.params.galleryId
  );
  const gallery = {};
  // TODO: validate and set content from request.body
  const updatedGallery = await model.updateGallery(gallery);
  response.json(updatedGallery);
});
/**
 * Delete a gallery.
 */
router.delete("/:galleryId", async (request, response) => {
  await authorizer.authorizeGalleryAdmin(
    request.user.id,
    request.params.galleryId
  );
  await model.deleteGallery(request.params.galleryId);
  response.status(204).end();
});
