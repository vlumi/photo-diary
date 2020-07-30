import React from "react";
import { Redirect } from "react-router-dom";
import PropTypes from "prop-types";

const Full = ({ gallery }) => {
  const path = gallery.lastPath();
  return <Redirect to={path} />;
};

Full.propTypes = {
  children: PropTypes.any,
  galleries: PropTypes.array.isRequired,
  gallery: PropTypes.object.isRequired,
};
export default Full;
