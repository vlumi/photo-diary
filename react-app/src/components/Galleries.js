import React from "react";
import PropTypes from "prop-types";

import Gallery from "./Gallery";

const Galleries = ({ galleries }) => (
  <>
    <ul>
      {galleries.map((gallery) => (
        <Gallery key={gallery.id} gallery={gallery} />
      ))}
    </ul>
  </>
);

Galleries.propTypes = {
  galleries: PropTypes.array,
};

export default Galleries;
