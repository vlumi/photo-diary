import React from "react";
import PropTypes from "prop-types";

import NavDay from "./NavDay";
import BodyDay from "./BodyDay";

const ViewDay = ({ gallery, year, month, day }) => {
  return (
    <>
      <NavDay gallery={gallery} year={year} month={month} day={day} />
      <BodyDay gallery={gallery} year={year} month={month} day={day} />
      <NavDay gallery={gallery} year={year} month={month} day={day} />
    </>
  );
};
ViewDay.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default ViewDay;
