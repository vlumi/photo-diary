import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import GalleryLink from "./GalleryLink";
import FormatDate from "./FormatDate";

const DateLink = ({ gallery, year, month, day }) => {
  if (!month) {
    return (
      <Link to="/g">
        <FormatDate year={year} />
      </Link>
    );
  }
  if (!day) {
    return (
      <>
        <GalleryLink gallery={gallery} year={year}>
          <FormatDate year={year} month={month} />
        </GalleryLink>
      </>
    );
  }
  return (
    <>
      <GalleryLink gallery={gallery} year={year} month={month}>
        <FormatDate year={year} month={month} day={day} />
      </GalleryLink>
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
