import axios from "axios";

import token from "../lib/token";

const baseUrl = "/api/v1/tokens";

const login = async (id, password) => {
  return await axios.post(baseUrl, { id, password });
};

const logout = async () => {
  const response = await axios.delete(baseUrl, token.createConfig());
  return response.data;
};

export default { login, logout };
