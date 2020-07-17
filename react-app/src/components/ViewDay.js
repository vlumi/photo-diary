import React from "react";
import PropTypes from "prop-types";

import NavDay from "./NavDay";
import Photos from "./Photos";

const ViewDay = ({ gallery, year, month, day }) => {
  const hasContent =
    year in gallery.photos &&
    month in gallery.photos[year] &&
    day in gallery.photos[year][month];
  return (
    <>
      <NavDay gallery={gallery} year={year} month={month} day={day} />
      <div>
        {hasContent ? <Photos photos={gallery.photos[year][month][day]} /> : ""}
      </div>
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
