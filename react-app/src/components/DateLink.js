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
          <children>
            <FormatDate year={year} month={month} />
          </children>
        </GalleryLink>
      </>
    );
  }
  return (
    <>
      <GalleryLink gallery={gallery} year={year} month={month}>
        <children>
          <FormatDate year={year} month={month} day={day} />
        </children>
      </GalleryLink>
    </>
  );
};
DateLink.propTypes = {
  children: PropTypes.object,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default DateLink;
