import React, { useState, useEffect } from "react";

import GalleriesBody from "./GalleriesBody";

import galleryService from "../services/galleries";

import theme from "../utils/theme";

const Galleries = () => {
  const [galleries, setGalleries] = useState([]);
  const [error, setError] = React.useState("");

  useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => setGalleries(returnedGalleries))
      .catch((error) => setError(error.message));
  }, []);

  if (error) {
    theme.setTheme("grayscale");
    return <div className="error">Loading failed</div>;
  }

  return (
    <>
      <h2>
        <span className="title">Galleries</span>
      </h2>
      <div id="content">
        <GalleriesBody galleries={galleries} />
      </div>
    </>
  );
};
export default Galleries;
