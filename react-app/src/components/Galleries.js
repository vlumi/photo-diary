import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";

import GalleriesBody from "./GalleriesBody";

import galleryService from "../services/galleries";

import Gallery from "../models/Gallery";

import config from "../utils/config";
import theme from "../utils/theme";

const Galleries = ({ user }) => {
  const [galleries, setGalleries] = useState([]);
  const [error, setError] = React.useState("");

  theme.setTheme(config.DEFAULT_THEME);

  useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => {
        const gals = returnedGalleries.map((gallery) => Gallery(gallery));
        setGalleries(gals);
      })
      .catch((error) => setError(error.message));
  }, [user]);

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
Galleries.propTypes = {
  user: PropTypes.object.isRequired,
};
export default Galleries;
