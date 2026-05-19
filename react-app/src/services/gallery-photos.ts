import api from "../lib/api";

const baseUrl = "/api/v1/gallery-photos";

const getAll = async (): Promise<unknown> => api(baseUrl);

const get = async (galleryId: string): Promise<unknown> =>
  api(`${baseUrl}/${galleryId}`);

export default { getAll, get };
