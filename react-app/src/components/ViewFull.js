import React from "react";
import { Redirect } from "react-router-dom";
import PropTypes from "prop-types";

import calendar from "../utils/calendar";

const getPath = (gallery) => {
  const [year, month] = calendar.lastYearMonth(gallery);
  if (year && month) {
    return [year, month].join("/");
  }
  return new Date().getFullYear();
};
const ViewFull = ({ gallery }) => (
  <Redirect to={`/g/${gallery.id}/${getPath(gallery)}`} />
);

ViewFull.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default ViewFull;
