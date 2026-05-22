import api, { unwrap } from "../lib/api";

const getAll = async () => unwrap(api.GET("/api/v1/meta", {}));

const get = async (key: string) =>
  unwrap(api.GET("/api/v1/meta/{key}", { params: { path: { key } } }));

export default { getAll, get };
