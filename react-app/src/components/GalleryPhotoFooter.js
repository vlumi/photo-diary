import React from "react";
import PropTypes from "prop-types";
import FlagIcon from "./FlagIcon";

import GalleryLink from "./GalleryLink";
import EpochAge from "./EpochAge";
import MapContainer from "./MapContainer";

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

  const renderPlace = () => {
    if (!photo.hasPlace()) {
      return "";
    }
    return <span>{photo.place()}</span>;
  };
  const renderCountry = () => {
    if (!photo.hasCountry()) {
      return "";
    }
    return (
      <span>
        {photo.countryName()} <FlagIcon code={photo.countryCode()} />
      </span>
    );
  };
  const renderLocation = () => {
    const country = renderCountry();
    const place = renderPlace();
    return (
      <div className="details">
        {place}
        {place && country ? ", " : ""}
        {country}
      </div>
    );
  };
  const renderCoordinates = () => {
    if (!photo.hasCoordinates()) {
      return <></>;
    }
    return <div className="details">{photo.formatCoordinates()}</div>;
  };
  const renderGear = () => {
    const camera = photo.formatCamera();
    const lens = photo.formatLens();

    if (!camera && !lens) {
      return "";
    }
    if (!camera) {
      return <>{lens}</>;
    }
    if (!lens) {
      return <>{camera}</>;
    }
    return (
      <>
        <span>{camera}</span> + <span>{lens}</span>
      </>
    );
  };
  const renderAge = () => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    return (
      <div className="details">
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
  const renderMap = () => {
    if (!photo.hasCoordinates()) {
      return "";
    }
    return (
      <>
        <MapContainer positions={[photo]} zoom="9" />
      </>
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
            {renderLocation()}
            {renderCoordinates()}
            <div className="details">{photo.formatExposure()}</div>
            <div className="details">{renderGear()}</div>
            {/* TODO: epochMode */}
            {renderAge()}
            <div className="copyright">
              <span>Photo Copyright © {photo.author()}</span>{" "}
              <span>All rights reserved.</span>
            </div>
          </span>
          <div className="next">{renderAdjacentPhoto(nextPhoto)}</div>
        </div>
        <div className="footer">{renderMap()}</div>
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
