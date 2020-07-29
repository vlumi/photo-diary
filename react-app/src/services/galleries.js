import axios from "axios";

import token from "../lib/token";

const baseUrl = "/api/galleries";

const getAll = async () => {
  const response = await axios.get(baseUrl, token.createConfig());
  return response.data;
};

const get = async (galleryId) => {
  const response = await axios.get(
    `${baseUrl}/${galleryId}`,
    token.createConfig()
  );
  return response.data;
};

export default {  getAll, get };
