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
    const path = `${config.PHOTO_ROOT}display/${adjacentPhoto.id()}`;

    return (
      <GalleryLink gallery={gallery} photo={adjacentPhoto}>
        <div className="adjacent" style={style}>
          <img src={path} alt={adjacentPhoto.id()} style={style} />
        </div>
      </GalleryLink>
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
          separator=" "
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
            <div className="copyright">{photo.copyright()}</div>
            <div className="location">
              {photo.place()} <FlagIcon code={photo.countryCode()} />
            </div>
            <div className="exposure">{photo.formatExposure()}</div>
            <div className="gear">{photo.formatGear()}</div>
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
