import React from "react";
import PropTypes from "prop-types";

import Photos from "./Photos";
import NavMonth from "./NavMonth";
import GalleryLink from "./GalleryLink";

const ViewMonth = ({ gallery, year, month }) => {
  const hasContent = year in gallery.photos && month in gallery.photos[year];

  const produceContent = () =>
    Object.keys(gallery.photos[year][month]).map((day) => {
      return (
        <Photos
          key={"" + year + month + day}
          photos={gallery.photos[year][month][day]}
        >
          <h3>
            <GalleryLink gallery={gallery} year={year} month={month} day={day}>
              {day}
            </GalleryLink>
          </h3>
        </Photos>
      );
    });
  return (
    <>
      <div className="month">
        <NavMonth gallery={gallery} year={year} month={month} />
        <div>{hasContent ? produceContent() : ""}</div>
        <NavMonth gallery={gallery} year={year} month={month} />
      </div>
    </>
  );
};
ViewMonth.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default ViewMonth;
