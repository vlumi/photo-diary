import React from "react";
import PropTypes from "prop-types";

import FormatDate from "./FormatDate";

import config from "../utils/config";

const GalleryPhotoFooter = ({ gallery, year, month, day, photo }) => {
  const previousPhoto = gallery.previousPhoto(year, month, day, photo);
  const nextPhoto = gallery.nextPhoto(year, month, day, photo);

  const renderAdjacentPhoto = (photo) => {
    if (!photo) {
      return <></>;
    }
    const style = {
      width: `${Math.floor(photo.dimensions.thumbnail.width / 5)}px`,
      height: `${Math.floor(photo.dimensions.thumbnail.height / 5)}px`,
    };
    const path = `${config.PHOTO_ROOT}display/${photo.id}`;

    return (
      <div className="adjacent" style={style}>
        <img src={path} alt={photo.id} style={style} />
      </div>
    );
  };

  return (
    <>
      <div className="footer">
        <span className="previous">{renderAdjacentPhoto(previousPhoto)}</span>
        <span className="description">
          <h4>
            <FormatDate year={year} month={month} day={day} />
          </h4>
          {/* TODO: more details */}
        </span>
        <div className="next">{renderAdjacentPhoto(nextPhoto)}</div>
      </div>
    </>
  );
};
GalleryPhotoFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryPhotoFooter;
