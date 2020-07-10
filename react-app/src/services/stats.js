import axios from "axios";

const baseUrl = "/api/stats";

const getGlobal = () => axios.get(baseUrl).then((response) => response.data);

const getGallery = (galleryId) =>
  axios.get(`${baseUrl}/${galleryId}`).then((response) => response.data);

export default { getGlobal, getGallery };
