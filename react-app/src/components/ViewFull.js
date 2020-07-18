import React from "react";
import { Redirect } from "react-router-dom";
import PropTypes from "prop-types";

const ViewFull = ({ gallery }) => {
  const path = gallery.lastPath();
  return <Redirect to={path} />;
};

ViewFull.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default ViewFull;
