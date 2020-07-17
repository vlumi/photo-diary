import React from "react";
import PropTypes from "prop-types";

import Photos from "./Photos";
import GalleryLink from "./GalleryLink";

const BodyMonth = ({ gallery, year, month }) => {
  const hasContent = gallery.includesMonth(year, month);

  const produceContent = () =>
    gallery.mapDays(year, month, (day) => {
      return (
        <Photos
          key={"" + year + month + day}
          gallery={gallery}
          photos={gallery.getPhotos(year, month, day)}
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
