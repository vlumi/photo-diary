import api from "../lib/api";

const baseUrl = "/api/v1/tokens";

const login = async (id: string, password: string): Promise<unknown> =>
  api(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password }),
  });

const logout = async (): Promise<unknown> =>
  api(baseUrl, { method: "DELETE" });

export default { login, logout };
