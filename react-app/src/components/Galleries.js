import React, { useState, useEffect } from "react";
import { Redirect } from "react-router-dom";

import GalleriesBody from "./GalleriesBody";

import galleryService from "../services/galleries";

import Gallery from "../models/Gallery";

import config from "../utils/config";
import theme from "../utils/theme";

const Galleries = () => {
  const [galleries, setGalleries] = useState([]);
  const [error, setError] = React.useState("");

  theme.setTheme(config.DEFAULT_THEME);

  useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => {
        // TODO: for admin show all galleries
        const gals = returnedGalleries
          .map((gallery) => Gallery(gallery))
          .filter((gallery) => !gallery.isSpecial(":"));
        setGalleries(gals);
      })
      .catch((error) => setError(error.message));
  }, []);

  if (error) {
    theme.setTheme("grayscale");
    return <div className="error">Loading failed</div>;
  }

  if (!galleries) {
    return <div>Loading...</div>;
  }
  if (galleries.length === 0) {
    return <i>Empty</i>;
  }

  if (galleries.length === 1) {
    return <Redirect to={galleries[0].lastPath()} />;
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
