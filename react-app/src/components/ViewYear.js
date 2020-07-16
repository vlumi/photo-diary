import React from "react";
import PropTypes from "prop-types";

import DumpPhotoNames from "./DumpPhotoNames";

const ViewYear = ({ gallery, year }) => (
  <>
    <h2>{year}</h2>
    <DumpPhotoNames gallery={gallery} year={year} />
  </>
);
ViewYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default ViewYear;
