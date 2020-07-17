import React from "react";
import PropTypes from "prop-types";

import Photos from "./Photos";

const BodyDay = ({ gallery, year, month, day }) => {
  return (
    <>
      <div>
        {gallery.includesDay(year, month, day) ? (
          <Photos gallery={gallery} photos={gallery.getPhotos(year, month, day)} />
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
