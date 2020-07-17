import React from "react";
import PropTypes from "prop-types";

import NavYear from "./NavYear";
import BodyYear from "./BodyYear";
import GalleryLink from "./GalleryLink";

const ViewYear = ({ gallery, year }) => {
  if (year < 0) {
    return (
      <>
        {gallery.mapYears((year) => (
          <div key={year} className="year">
            <h2>
              <GalleryLink gallery={gallery} year={Number(year)}>{year}</GalleryLink>
            </h2>
            <BodyYear gallery={gallery} year={Number(year)} />
          </div>
        ))}
      </>
    );
  } else {
    return (
      <div className="year">
        <NavYear gallery={gallery} year={year} />
        <BodyYear gallery={gallery} year={year} />
        <NavYear gallery={gallery} year={year} />
      </div>
    );
  }
};
ViewYear.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default ViewYear;
