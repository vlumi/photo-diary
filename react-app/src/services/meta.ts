import api from "../lib/api";

const baseUrl = "/api/v1/meta";

const getAll = async (): Promise<unknown> => api(baseUrl);

const get = async (key: string): Promise<unknown> => api(`${baseUrl}/${key}`);

export default { getAll, get };
