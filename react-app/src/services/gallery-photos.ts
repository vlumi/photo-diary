import api, { unwrap } from "../lib/api";

const get = async (galleryId: string, lang?: string) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}", {
      params: { path: { galleryId }, query: lang ? { lang } : undefined },
    })
  );

export default { get };
