import api, { unwrap } from "../lib/api";

const get = async (galleryId: string) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}", {
      params: { path: { galleryId } },
    })
  );

export default { get };
