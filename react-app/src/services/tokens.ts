import api, { unwrap } from "../lib/api";

const login = async (id: string, password: string) =>
  unwrap(api.POST("/api/v1/tokens", { body: { id, password } }));

// Logout sends the current refresh token in the body so the server can
// delete its session row. The bearer access token still authorizes the
// call (`security: [{ bearer: [] }]`); the refresh token identifies
// which device's session to revoke.
const logout = async (refreshToken?: string) =>
  unwrap(
    api.DELETE("/api/v1/tokens", {
      body: refreshToken ? { refreshToken } : {},
    })
  );

const refresh = async (refreshToken: string) =>
  unwrap(api.POST("/api/v1/tokens/refresh", { body: { refreshToken } }));

export default { login, logout, refresh };
