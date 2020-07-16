import axios from "axios";

const baseUrl = "/api/galleries";

const getAll = async () => axios.get(baseUrl).then((response) => response.data);

const get = async (galleryId) => {
  const response = await axios.get(`${baseUrl}/${galleryId}`);
  return response.data;
};

export default { getAll, get };
