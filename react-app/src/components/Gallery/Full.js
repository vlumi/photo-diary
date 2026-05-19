import React from "react";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";

const Full = ({ gallery }) => {
  const path = gallery.lastPath();
  return <Navigate to={path} replace />;
};

Full.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
};
export default Full;
