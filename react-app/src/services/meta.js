import api from "../lib/api";

const baseUrl = "/api/v1/meta";

const getAll = async () => api(baseUrl);

const get = async (key) => api(`${baseUrl}/${key}`);

export default { getAll, get };
