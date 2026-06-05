import api, { unwrap } from "../lib/api";

const get = async (galleryId: string, lang?: string) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}", {
      params: { path: { galleryId }, query: lang ? { lang } : undefined },
    })
  );

const link = async (galleryId: string, photoId: string): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/gallery-photos/{galleryId}/{photoId}", {
      params: { path: { galleryId, photoId } },
    })
  );
};

const unlink = async (galleryId: string, photoId: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/gallery-photos/{galleryId}/{photoId}", {
      params: { path: { galleryId, photoId } },
    })
  );
};

export default { get, link, unlink };
