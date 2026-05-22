import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import EpochAge from "../EpochAge";
import EpochDayIndex from "../EpochDayIndex";
import FlagIcon from "../../FlagIcon";
import Link from "../Link";
import MapContainer from "../../MapContainer.lazy";
import Root from "../Footer";

import config from "../../../lib/config";
import format from "../../../lib/format";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

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
const ThumbnailFrame = styled.div`
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

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: Photo;
  lang: string;
  countryData: CountryData;
}

const Footer = ({
  gallery,
  year,
  month,
  day,
  photo,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  const previousPhoto = gallery.previousPhoto(year, month, day, photo);
  const nextPhoto = gallery.nextPhoto(year, month, day, photo);
  const formatExposure = format.exposure(lang, t);

  const renderAdjacentPhoto = (adjacentPhoto: Photo) => {
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
        <ThumbnailFrame style={style}>
          <img src={path} alt={adjacentPhoto.id()} style={style} />
        </ThumbnailFrame>
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
    const countryCode = photo.countryCode();
    if (!photo.hasCountry() || !countryCode) {
      return "";
    }
    return (
      <Part>
        {photo.countryName(lang, countryData)} <FlagIcon code={countryCode} />
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
    const focalLength = photo.focalLength();
    const aperture = photo.aperture();
    const exposureTime = photo.exposureTime();
    const iso = photo.iso();
    const resolution = photo.resolution();
    const orientation = photo.orientation();
    const aspectRatio = photo.aspectRatio();
    const exposureValue = photo.exposureValue();
    const lightValue = photo.lightValue();
    return [
      focalLength ? `ƒ=${formatExposure.focalLength(focalLength)}㎜` : "",
      aperture ? formatExposure.aperture(aperture) : "",
      exposureTime ? `${formatExposure.exposureTime(exposureTime)}s` : "",
      iso ? `ISO${formatExposure.iso(iso)}` : "",
      resolution ? `${formatExposure.resolution(resolution)}MP` : "",
      orientation ? `${formatExposure.orientation(orientation)}` : "",
      aspectRatio
        ? `${formatExposure.aspectRatio(Number(aspectRatio))}`
        : "",
      exposureValue ? `EV${formatExposure.ev(exposureValue)}` : "",
      lightValue ? `LV${formatExposure.ev(lightValue)}` : "",
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
    if (!photo.hasCoordinates() || gallery.hideMap()) {
      return "";
    }
    return <MapContainer positions={[photo]} />;
  };

  const renderContent = () => {
    if (!photo) {
      return <></>;
    }
    return (
      <>
        <Root>
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
        </Root>
        <Root>{renderMap()}</Root>
      </>
    );
  };

  return renderContent();
};
export default Footer;
