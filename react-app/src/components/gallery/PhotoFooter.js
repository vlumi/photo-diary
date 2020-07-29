import React from "react";
import PropTypes from "prop-types";

import FlagIcon from "../FlagIcon";
import EpochAge from "./EpochAge";
import EpochDayIndex from "./EpochDayIndex";
import MapContainer from "../MapContainer";

import Link from "./Link";

import config from "../../lib/config";

const PhotoFooter = ({
  gallery,
  year,
  month,
  day,
  photo,
  lang,
  countryData,
}) => {
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
      <Link gallery={gallery} photo={adjacentPhoto}>
        <div className="adjacent" style={style}>
          <img src={path} alt={adjacentPhoto.id()} style={style} />
        </div>
      </Link>
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
        {photo.countryName(lang, countryData)}{" "}
        <FlagIcon code={photo.countryCode()} />
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
  const renderEpochInfo = () => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    switch (gallery.epochType()) {
      case "birthday":
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
      case "1-index":
        return (
          <div className="details">
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              format="long"
            />
          </div>
        );
      case "0-index":
        return (
          <div className="details">
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              format="long"
              start={0}
            />
          </div>
        );
      default:
        return "";
    }
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
            {renderEpochInfo()}
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
PhotoFooter.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default PhotoFooter;
