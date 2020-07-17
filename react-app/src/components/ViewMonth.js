import React from "react";
import PropTypes from "prop-types";

import NavMonth from "./NavMonth";
import BodyMonth from "./BodyMonth";

const ViewMonth = ({ gallery, year, month }) => {
  return (
    <>
      <div className="month">
        <NavMonth gallery={gallery} year={year} month={month} />
        <BodyMonth gallery={gallery} year={year} month={month} />
        <NavMonth gallery={gallery} year={year} month={month} />
      </div>
    </>
  );
};
ViewMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default ViewMonth;
