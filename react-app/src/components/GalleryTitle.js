import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const GalleryTitle = ({ gallery }) => (
  <>
    {/* TODO: design */}
    <span>
      <Link to="/g">galleries</Link>
    </span>
    <h1>{gallery.title()}</h1>
  </>
);
GalleryTitle.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default GalleryTitle;
