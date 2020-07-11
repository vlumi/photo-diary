import React from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";

import galleryService from "./services/galleries";

const Gallery = ({ galleries }) => {
  const galleryId = useParams().galleryId;
  const gallery = galleries.find((gallery) => gallery.id === galleryId);
  if (gallery) {
    return (
      <>
        <h2>{gallery.title}</h2>
        <div>TODO: implement</div>
      </>
    );
  } else {
    return <></>;
  }
};
Gallery.propTypes = {
  gallery: PropTypes.object,
};

export default Gallery;
