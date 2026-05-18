import api from "../lib/api";

const baseUrl = "/api/v1/galleries";

const getAll = async () => api(baseUrl);

const get = async (galleryId) => api(`${baseUrl}/${galleryId}`);

export default { getAll, get };
