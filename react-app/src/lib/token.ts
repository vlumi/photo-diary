// In-memory bearer cache. The User store's localStorage row is the
// durable copy; this module is read on every API request (via
// `createConfig`) and updated on login / refresh / logout. Storing
// both halves of the pair so the refresh-on-401 middleware can mint
// new access tokens without a re-login.
let accessToken: string | undefined = undefined;
let refreshToken: string | undefined = undefined;

const setTokens = (access?: string, refresh?: string): void => {
  accessToken = access;
  refreshToken = refresh;
};
const clearTokens = (): void => {
  accessToken = undefined;
  refreshToken = undefined;
};
const getAccessToken = (): string | undefined => accessToken;
const getRefreshToken = (): string | undefined => refreshToken;

const createConfig = (): { headers?: { Authorization: string } } => {
  if (!accessToken) return {};
  return { headers: { Authorization: `bearer ${accessToken}` } };
};

export default {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  createConfig,
};
