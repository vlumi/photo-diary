import axios from "axios";

import token from "../lib/token";

const baseUrl = "/api/v1/meta";

const getAll = async () => {
  const response = await axios.get(baseUrl, token.createConfig());
  return response.data;
};

const get = async (key) => {
  const response = await axios.get(
    `${baseUrl}/${key}`,
    token.createConfig()
  );
  return response.data;
};

export default { getAll, get };
