import React from "react";
import PropTypes from "prop-types";

import NavGalleryPhoto from "./NavGalleryPhoto";

import config from "../utils/config";

const GalleryPhoto = ({ gallery, year, month, day, photo }) => {
  const path = `${config.PHOTO_ROOT}display/${photo.id}`;
  return (
    <>
      <NavGalleryPhoto
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
      />
      {/* TODO: design */}
      <div>
        <img src={path} alt={photo.id}/>
        {photo.id}
      </div>
      <NavGalleryPhoto
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
      />
    </>
  );
};
GalleryPhoto.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryPhoto;
