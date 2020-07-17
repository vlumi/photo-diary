import React from "react";
import PropTypes from "prop-types";

import Photos from "./Photos";

const BodyDay = ({ gallery, year, month, day }) => {
  const hasContent =
    year in gallery.photos &&
    month in gallery.photos[year] &&
    day in gallery.photos[year][month];
  return (
    <>
      <div>
        {hasContent ? (
          <Photos gallery={gallery} photos={gallery.photos[year][month][day]} />
        ) : (
          ""
        )}
      </div>
    </>
  );
};
BodyDay.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default BodyDay;
