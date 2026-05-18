import api from "../lib/api";

const baseUrl = "/api/v1/gallery-photos";

const getAll = async () => api(baseUrl);

const get = async (galleryId) => api(`${baseUrl}/${galleryId}`);

export default { getAll, get };
