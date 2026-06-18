import api, { unwrap } from "../lib/api";

const get = async () => unwrap(api.GET("/api/v1/operations", {}));

export default { get };
