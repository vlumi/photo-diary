import api, { unwrap } from "../lib/api";

const login = async (id: string, password: string) =>
  unwrap(api.POST("/api/v1/tokens", { body: { id, password } }));

const logout = async () => unwrap(api.DELETE("/api/v1/tokens", {}));

export default { login, logout };
