import React from "react";
import PropTypes from "prop-types";

const ViewFull = ({ gallery }) => (
  <>
    <h2>All</h2>
    <div>TODO: jump to last month? {console.log(gallery)}</div>
  </>
);
ViewFull.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default ViewFull;
