import axios from "axios";

const baseUrl = "/api/galleries";

const getAll = () => axios.get(baseUrl).then((response) => response.data);

const get = (galleryId) =>
  axios.get(`${baseUrl}/${galleryId}`).then((response) => response.data);

export default { getAll, get };
