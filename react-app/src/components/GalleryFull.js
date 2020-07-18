import React from "react";
import { Redirect } from "react-router-dom";
import PropTypes from "prop-types";

const GalleryFull = ({ gallery }) => {
  const path = gallery.lastPath();
  return <Redirect to={path} />;
};

GalleryFull.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default GalleryFull;
