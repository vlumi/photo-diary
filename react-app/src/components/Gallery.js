import React from "react";
import PropTypes from "prop-types";

const Gallery = ({ gallery }) => {
  return (
    <>
      <li>{gallery.title}</li>
    </>
  );
};
Gallery.propTypes = {
  gallery: PropTypes.object,
};

export default Gallery;
