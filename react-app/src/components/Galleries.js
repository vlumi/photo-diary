import React from "react";
import PropTypes from "prop-types";

import GalleriesBody from "./GalleriesBody";

import GalleryModel from "../models/Gallery";

const Galleries = ({ galleries }) => {
  return (
    <>
      {/* TODO: design */}
      <h2>
        <span className="title">Galleries</span>
      </h2>
      <div id="content">
        <div className="galleries">
          {galleries
            .map((gallery) => GalleryModel(gallery))
            .map((gallery) => (
              <GalleriesBody key={gallery.id()} gallery={gallery} />
            ))}
        </div>
      </div>
    </>
  );
};
Galleries.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default Galleries;
