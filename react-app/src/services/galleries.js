import axios from "axios";

const baseUrl = "/api/galleries";

const getAll = async () => {
  return await axios.get(baseUrl).then((response) => {
    return response.data;
  });
};

const get = async (galleryId) => {
  const response = await axios.get(`${baseUrl}/${galleryId}`);
  response.data.theme = "blue";
  return response.data;
};

export default { getAll, get };
