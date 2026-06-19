import api, { unwrap } from "../lib/api";

const login = async (id: string, password: string) =>
  unwrap(api.POST("/api/v1/tokens", { body: { id, password } }));

// Logout sends an empty body — the server reads the refresh cookie to
// identify which session row to revoke and clears the auth cookies.
const logout = async () =>
  unwrap(api.DELETE("/api/v1/tokens", { body: {} }));

export default { login, logout };
