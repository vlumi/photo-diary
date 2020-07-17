import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import FormatDate from "./FormatDate";

const DateLink = ({ gallery, year, month, day }) => {
  if (!year) {
    return "";
  }
  if (!month) {
    return (
      <>
        <Link to={`/g/${gallery.id}/${year}`}>
          <FormatDate year={year} />
        </Link>
      </>
    );
  }
  if (!day) {
    return (
      <>
        <Link to={`/g/${gallery.id}/${year}`}>
          <FormatDate year={year} />
        </Link>
        -
        <Link to={`/g/${gallery.id}/${year}/${month}`}>
          <FormatDate month={month} />
        </Link>
      </>
    );
  }
  return (
    <>
      <Link to={`/g/${gallery.id}/${year}`}>
        <FormatDate year={year} />
      </Link>
      -
      <Link to={`/g/${gallery.id}/${year}/${month}`}>
        <FormatDate month={month} />
      </Link>
      -
      <Link to={`/g/${gallery.id}/${year}/${month}/${day}`}>
        <FormatDate day={day} />
      </Link>
    </>
  );
};
DateLink.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default DateLink;
