let token = undefined;
const setToken = (newToken) => {
  if (newToken) {
    token = `bearer ${newToken}`;
  } else {
    clearToken();
  }
};
const clearToken = () => {
  token = undefined;
};

const createConfig = () => {
  const config = {};
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = token;
  }
  return config;
};

export default { setToken, clearToken, createConfig };
