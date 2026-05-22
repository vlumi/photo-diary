import type { FastifyPluginAsync } from "fastify";

import CONST from "../lib/constants.js";
import authorizerFactory from "../lib/authorizer.js";
import { shouldHideMap, maskCoordinates } from "../lib/privacy.js";
import modelFactory from "../models/photo.js";

const authorizer = authorizerFactory();
const model = modelFactory();

const init = async () => {
  await model.init();
};

const plugin: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all photos.
   */
  fastify.get("/", async (request) => {
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
    return photos;
  });

  /**
   * Create a photo.
   */
  fastify.post("/", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const photo = {};
    // TODO: validate and set content from request.body
    return await model.createPhoto(photo);
  });

  /**
   * Get the matching photo.
   */
  fastify.get<{ Params: { photoId: string } }>("/:photoId", async (request) => {
    await authorizer.authorizeView(request.user.id);
    const photo = await model.getPhoto(request.params.photoId);
    if (await shouldHideMap(request.user.id, CONST.SPECIAL_GALLERY_ALL)) {
      maskCoordinates([photo] as Parameters<typeof maskCoordinates>[0]);
    }
    return photo;
  });

  /**
   * Update the matching photo.
   */
  fastify.put<{ Params: { photoId: string } }>("/:photoId", async (request) => {
    await authorizer.authorizeAdmin(request.user.id);
    const photo = {};
    // TODO: validate and set content from request.body
    return await model.updatePhoto(photo);
  });

  /**
   * Delete the matching photo.
   */
  fastify.delete<{ Params: { photoId: string } }>(
    "/:photoId",
    async (request, reply) => {
      await authorizer.authorizeAdmin(request.user.id);
      await model.deletePhoto(request.params.photoId);
      reply.status(204).send();
    }
  );
};

export default { init, plugin };
