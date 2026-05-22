import api, { unwrap } from "../lib/api";

const getAll = async () => unwrap(api.GET("/api/v1/galleries", {}));

const get = async (galleryId: string) =>
  unwrap(
    api.GET("/api/v1/galleries/{galleryId}", {
      params: { path: { galleryId } },
    })
  );

export default { getAll, get };
