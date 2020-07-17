import React from "react";
import PropTypes from "prop-types";

import Photos from "./Photos";
import GalleryLink from "./GalleryLink";

const BodyMonth = ({ gallery, year, month }) => {
  const hasContent = year in gallery.photos && month in gallery.photos[year];

  const produceContent = () =>
    Object.keys(gallery.photos[year][month]).map((day) => {
      return (
        <Photos
          key={"" + year + month + day}
          gallery={gallery}
          photos={gallery.photos[year][month][day]}
        >
          <h3>
            <GalleryLink
              gallery={gallery}
              year={year}
              month={month}
              day={Number(day)}
            >
              {day}
            </GalleryLink>
          </h3>
        </Photos>
      );
    });
  return (
    <>
      <div>{hasContent ? produceContent() : ""}</div>
    </>
  );
};
BodyMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default BodyMonth;
