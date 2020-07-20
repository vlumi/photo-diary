import React from "react";
import PropTypes from "prop-types";

import GalleriesBody from "./GalleriesBody";

import G from "../utils/gallery";

const Galleries = ({ galleries }) => {
  return (
    <>
      {/* TODO: design */}
      <h2>
        <span className="title">Galleries</span>
      </h2>
      <div className="content">
        <div className="galleries">
          {galleries
            .map((gallery) => G(gallery))
            .map((gallery) => (
              <GalleriesBody key={gallery.id} gallery={gallery} />
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
