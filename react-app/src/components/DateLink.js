import React from "react";
import PropTypes from "prop-types";

import Link from "./gallery/Link";
import FormatDate from "./FormatDate";

const DateLink = ({ gallery, year, month, day }) => {
  if (!month) {
    return (
      <Link>
        <FormatDate year={year} />
      </Link>
    );
  }
  if (!day) {
    return (
      <>
        <Link gallery={gallery} year={year}>
          <FormatDate year={year} month={month} />
        </Link>
      </>
    );
  }
  return (
    <>
      <Link gallery={gallery} year={year} month={month}>
        <FormatDate year={year} month={month} day={day} />
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
