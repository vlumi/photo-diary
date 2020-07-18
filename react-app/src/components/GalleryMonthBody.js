import React from "react";
import PropTypes from "prop-types";

import GalleryThumbnails from "./GalleryThumbnails";
import GalleryLink from "./GalleryLink";

import calendar from "../utils/calendar";

const GalleryMonthBody = ({ gallery, year, month }) => {
  const hasContent = gallery.includesMonth(year, month);

  const produceContent = () =>
    gallery.mapDays(year, month, (day) => {
      return (
        <GalleryThumbnails
          key={"" + year + month + day}
          gallery={gallery}
          photos={gallery.photos(year, month, day)}
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
            <span>{calendar.dayOfWeek(year, month, day)}</span>
          </h3>
        </GalleryThumbnails>
      );
    });
  return (
    <>
      <div>{hasContent ? produceContent() : ""}</div>
    </>
  );
};
GalleryMonthBody.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonthBody;
