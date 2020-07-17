import React from "react";
import PropTypes from "prop-types";

import GalleryLink from "./GalleryLink";
import FormatDate from "./FormatDate";

const DateLink = ({ gallery, year, month, day }) => {
  if (!month) {
    return (
      <GalleryLink gallery={gallery} year={year}>
        <FormatDate year={year} />
      </GalleryLink>
    );
  }
  if (!day) {
    return (
      <>
        <GalleryLink gallery={gallery} year={year}>
          <FormatDate year={year} />
        </GalleryLink>
        -
        <GalleryLink gallery={gallery} year={year} month={month}>
          <FormatDate month={month} />
        </GalleryLink>
      </>
    );
  }
  return (
    <>
      <GalleryLink gallery={gallery} year={year}>
        <FormatDate year={year} />
      </GalleryLink>
      -
      <GalleryLink gallery={gallery} year={year} month={month}>
        <FormatDate month={month} />
      </GalleryLink>
      -
      <GalleryLink gallery={gallery} year={year} month={month} day={day}>
        <FormatDate day={day} />
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
