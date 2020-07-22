import axios from "axios";

const baseUrl = "/api/stats";

let token = undefined;
const setToken = (newToken) => {
  token = `bearer ${newToken}`;
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

const getGlobal = () =>
  axios.get(baseUrl, createConfig()).then((response) => response.data);

const getGallery = (galleryId) =>
  axios
    .get(`${baseUrl}/${galleryId}`, createConfig())
    .then((response) => response.data);

export default { setToken, clearToken, getGlobal, getGallery };
