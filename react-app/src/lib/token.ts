let token: string | undefined = undefined;

const setToken = (newToken?: string): void => {
  if (newToken) {
    token = `bearer ${newToken}`;
  } else {
    clearToken();
  }
};
const clearToken = (): void => {
  token = undefined;
};

const createConfig = (): { headers?: { Authorization: string } } => {
  const config: { headers?: { Authorization: string } } = {};
  if (token) {
    config.headers = { Authorization: token };
  }
  return config;
};

export default { setToken, clearToken, createConfig };
