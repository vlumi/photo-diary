import api, { unwrap } from "../lib/api";

const login = async (id: string, password: string) =>
  unwrap(api.POST("/api/v1/tokens", { body: { id, password } }));

// Logout takes no body — the server reads the refresh cookie to
// identify which session row to revoke and clears the auth cookies.
const logout = async () => unwrap(api.DELETE("/api/v1/tokens", {}));

// Cross-host SSO mint (#664). Returns a redirectUrl the SPA points
// the browser at via window.location — the target host's /sso
// endpoint validates the token, sets cookies, 302s to `path`.
const crossHost = async (target: string, path?: string) =>
  unwrap(
    api.POST("/api/v1/tokens/cross-host", {
      body: path ? { target, path } : { target },
    })
  );

export default { login, logout, crossHost };
