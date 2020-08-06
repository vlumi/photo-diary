import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import FlagIcon from "../FlagIcon";
import EpochAge from "./EpochAge";
import EpochDayIndex from "./EpochDayIndex";
import MapContainer from "../MapContainer";

import Link from "./Link";

import config from "../../lib/config";
import format from "../../lib/format";

const Footer = styled.div`
  margin: 10px;
  flex-grow: 0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  overflow: hidden;
`;
const ThumbnailContainer = styled.span`
  width: 70px;
  height: 50px;
  display: flex;
`;
const PreviousThumbnailContainer = styled(ThumbnailContainer)`
  justify-content: flex-start;
`;
const NextThumbnailContainer = styled(ThumbnailContainer)`
  justify-content: flex-end;
`;
const Adjacent = styled.div`
  margin: 0;
  padding: 2px;
  border: solid #004 1px;
`;
const Description = styled.span`
  flex-grow: 1;
  text-align: center;
  margin: 0 10px;
`;
const Details = styled.div`
  font-size: small;
  text-align: right;
  color: var(--inactive-color);
`;
const Part = styled.span`
  display: inline-block;
`;
const Copyright = styled.div`
  flex-grow: 1;
  text-align: center;
  margin: 0 10px;
  font-size: x-small;
`;

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
  const formatExposure = format.exposure(lang);

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
        <Adjacent style={style}>
          <img src={path} alt={adjacentPhoto.id()} style={style} />
        </Adjacent>
      </Link>
    );
  };

  const renderPlace = () => {
    if (!photo.hasPlace()) {
      return "";
    }
    return <Part>{photo.place()}</Part>;
  };
  const renderCountry = () => {
    if (!photo.hasCountry()) {
      return "";
    }
    return (
      <Part>
        {photo.countryName(lang, countryData)}{" "}
        <FlagIcon code={photo.countryCode()} />
      </Part>
    );
  };
  const renderLocation = () => {
    const country = renderCountry();
    const place = renderPlace();
    return (
      <Details>
        {place}
        {place && country ? ", " : ""}
        {country}
      </Details>
    );
  };
  const renderCoordinates = () => {
    if (!photo.hasCoordinates()) {
      return <></>;
    }
    return <Details>{photo.formatCoordinates()}</Details>;
  };
  const renderExposure = () => {
    return [
      photo.focalLength()
        ? `ƒ=${formatExposure.focalLength(photo.focalLength())}㎜`
        : "",
      photo.aperture() ? formatExposure.aperture(photo.aperture()) : "",
      photo.exposureTime()
        ? `${formatExposure.exposureTime(photo.exposureTime())}s`
        : "",
      photo.iso() ? `ISO${formatExposure.iso(photo.iso())}` : "",
      photo.resolution()
        ? `${formatExposure.resolution(photo.resolution())}MP`
        : "",
      photo.exposureValue()
        ? `EV${formatExposure.ev(photo.exposureValue())}`
        : "",
      photo.lightValue() ? `LV${formatExposure.ev(photo.lightValue())}` : "",
    ].join(" ");
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
        <Part>{camera}</Part> + <Part>{lens}</Part>
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
          <Details>
            <EpochAge
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              format="long"
              separator=" "
            />
          </Details>
        );
      case "1-index":
        return (
          <Details>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              format="long"
            />
          </Details>
        );
      case "0-index":
        return (
          <Details>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              format="long"
              start={0}
            />
          </Details>
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
        <Footer>
          <PreviousThumbnailContainer>
            {renderAdjacentPhoto(previousPhoto)}
          </PreviousThumbnailContainer>
          <Description>
            <h4>{photo.formatTimestamp()}</h4>
            {photo.title()}
            {renderLocation()}
            {renderCoordinates()}
            <Details>{renderExposure()}</Details>
            <Details>{renderGear()}</Details>
            {renderEpochInfo()}
            <Copyright>
              <Part>Photo Copyright © {photo.author()}</Part>{" "}
              <Part>All rights reserved.</Part>
            </Copyright>
          </Description>
          <NextThumbnailContainer>
            {renderAdjacentPhoto(nextPhoto)}
          </NextThumbnailContainer>
        </Footer>
        <Footer>{renderMap()}</Footer>
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
