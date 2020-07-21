import axios from "axios";

const baseUrl = "/api/tokens";

const login = async (id, password) => {
  return await axios.post(baseUrl, { id, password });
};

const logout = async () => {
  const response = await axios.delete(baseUrl);
  return response.data;
};

export default { login, logout };
