import React from "react";
import PropTypes from "prop-types";

import DumpPhotoNames from "./DumpPhotoNames";

const ViewFull = ({ gallery }) => (
  <>
    <h2>All</h2>
    <DumpPhotoNames gallery={gallery} />
  </>
);
ViewFull.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default ViewFull;
