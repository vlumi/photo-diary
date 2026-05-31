import api, { unwrap } from "../lib/api";

const getAll = async () => unwrap(api.GET("/api/v1/meta", {}));

export default { getAll };
