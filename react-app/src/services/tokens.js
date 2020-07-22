import axios from "axios";

const baseUrl = "/api/tokens";

const user = {};
const token = undefined;

const isLoggedIn = () => !!token;
const id = () => {
  if (user && "id" in user) {
    return user.id;
  }
  return "";
};

const login = async (id, password) => {
  return await axios.post(baseUrl, { id, password });
};

const logout = async () => {
  const response = await axios.delete(baseUrl);
  return response.data;
};

export default { isLoggedIn, id, login, logout };
