import React from "react";
import PropTypes from "prop-types";
import FlagIcon from "./FlagIcon";

import GalleryLink from "./GalleryLink";
import EpochAge from "./EpochAge";

import config from "../utils/config";

const GalleryPhotoFooter = ({ gallery, year, month, day, photo }) => {
  const previousPhoto = gallery.previousPhoto(year, month, day, photo);
  const nextPhoto = gallery.nextPhoto(year, month, day, photo);

  const renderAdjacentPhoto = (adjacentPhoto) => {
    if (adjacentPhoto === photo) {
      return <></>;
    }
    const dimensions = adjacentPhoto.thumbnailDimensions();
    const style = {
      width: `${Math.floor(dimensions.width / 5)}px`,
      height: `${Math.floor(dimensions.height / 5)}px`,
    };
    const path = `${config.PHOTO_ROOT_URL}display/${adjacentPhoto.id()}`;

    return (
      <GalleryLink gallery={gallery} photo={adjacentPhoto}>
        <div className="adjacent" style={style}>
          <img src={path} alt={adjacentPhoto.id()} style={style} />
        </div>
      </GalleryLink>
    );
  };

  const renderExposure = () => {
    return (
      <div className="exposure">
        <span></span>
        <span>{photo.formatFocalLength()}</span>{" "}
        <span>{photo.formatAperture()}</span>{" "}
        <span>{photo.formatExposureTime()}</span>{" "}
        <span>{photo.formatIso()}</span> <span>{photo.formatMegapixels()}</span>
      </div>
    );
  };
  const renderGear = () => {
    const camera = photo.formatCamera();
    const lens = photo.formatLens();

    if (!camera && !lens) {
      return <></>;
    }
    if (!camera) {
      return <div className="gear">{lens}</div>;
    }
    if (!lens) {
      return <div className="gear">{camera}</div>;
    }
    return (
      <div className="gear">
        <span>{camera}</span> + <span>{lens}</span>
      </div>
    );
  };
  const renderAge = () => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    return (
      <div className="age">
        <EpochAge
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          format="long"
          separator=""
        />
      </div>
    );
  };
  const renderContent = () => {
    if (!photo) {
      return <></>;
    }
    return (
      <>
        <div className="footer">
          <span className="previous">{renderAdjacentPhoto(previousPhoto)}</span>
          <span className="description">
            <h4>{photo.formatTimestamp()}</h4>
            {photo.title()}
            <div className="copyright">
              <span>Photo Copyright © {photo.author()}</span>{" "}
              <span>All rights reserved.</span>
            </div>
            <div className="location">
              <span>{photo.place()}</span>{" "}
              <span>
                {photo.countryName()} <FlagIcon code={photo.countryCode()} />
              </span>
            </div>
            {renderExposure()}
            {renderGear()}
            {/* TODO: epochMode */}
            {renderAge()}
          </span>
          <div className="next">{renderAdjacentPhoto(nextPhoto)}</div>
        </div>
      </>
    );
  };

  return renderContent();
};
GalleryPhotoFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryPhotoFooter;
