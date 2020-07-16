import React from "react";
import PropTypes from "prop-types";

import DateLink from "./DateLink";
import Photos from "./Photos";

const ViewDay = ({ gallery, year, month, day }) => (
  <>
    <h2>
      <DateLink gallery={gallery} year={year} month={month} day={day} />
    </h2>

    <div>
      <Photos photos={gallery.photos[year][month][day]} />
    </div>
  </>
);
ViewDay.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
};
export default ViewDay;
