import React from "react";
import PropTypes from "prop-types";

import GalleriesBody from "./GalleriesBody";

const Galleries = ({ galleries }) => {
  return (
    <>
      {/* TODO: design */}
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
  galleries: PropTypes.array.isRequired,
};
export default Galleries;
