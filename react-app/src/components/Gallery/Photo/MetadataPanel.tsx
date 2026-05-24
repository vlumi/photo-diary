import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { BsXLg } from "react-icons/bs";

import EpochAge from "../EpochAge";
import EpochDayIndex from "../EpochDayIndex";
import FlagIcon from "../../FlagIcon";
import MapContainer from "../../MapContainer.lazy";

import format from "../../../lib/format";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

// Floating panel anchored to the bottom-right, above the info
// toggle button. `bottom: 52px` = button bottom (8) + button
// diameter (34) + 10px gap.
const Root = styled.div`
  position: absolute;
  z-index: 9;
  right: 16px;
  bottom: 52px;
  max-width: min(360px, calc(100% - 32px));
  max-height: calc(100% - 130px);
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px 6px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
`;
const HeaderTitle = styled.span`
  font-size: 0.8em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
`;
const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  &:hover {
    color: #fff;
  }
`;
const Body = styled.div`
  padding: 10px 14px 14px;
  overflow-y: auto;
  font-size: 0.85em;
  line-height: 1.4;
`;
const Title = styled.div`
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.3;
`;
const Row = styled.div`
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
`;
const Muted = styled.div`
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85em;
  margin-top: 4px;
`;
const Part = styled.span`
  display: inline;
`;
const Copyright = styled.div`
  font-size: 0.75em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 10px;
`;
const MapBox = styled.div`
  margin-top: 10px;
  height: 160px;
  border-radius: 6px;
  overflow: hidden;
`;

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: Photo;
  lang: string;
  countryData: CountryData;
  onClose: () => void;
}

const MetadataPanel = ({
  gallery,
  year,
  month,
  day,
  photo,
  lang,
  countryData,
  onClose,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const formatExposure = format.exposure(lang, t);

  const renderPlace = () => {
    if (!photo.hasPlace()) return null;
    return <Part>{photo.place()}</Part>;
  };
  const renderCountry = () => {
    const countryCode = photo.countryCode();
    if (!photo.hasCountry() || !countryCode) return null;
    return (
      <Part>
        {photo.countryName(lang, countryData)} <FlagIcon code={countryCode} />
      </Part>
    );
  };
  const renderLocation = () => {
    const country = renderCountry();
    const place = renderPlace();
    if (!country && !place) return null;
    return (
      <Row>
        {place}
        {place && country ? ", " : ""}
        {country}
      </Row>
    );
  };
  const renderCoordinates = () => {
    if (!photo.hasCoordinates()) return null;
    return <Muted>{photo.formatCoordinates()}</Muted>;
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
    const parts = [
      focalLength ? `ƒ=${formatExposure.focalLength(focalLength)}㎜` : "",
      aperture ? formatExposure.aperture(aperture) : "",
      exposureTime ? `${formatExposure.exposureTime(exposureTime)}s` : "",
      iso ? `ISO${formatExposure.iso(iso)}` : "",
      resolution ? `${formatExposure.resolution(resolution)}MP` : "",
      orientation ? `${formatExposure.orientation(orientation)}` : "",
      aspectRatio ? String(aspectRatio) : "",
      exposureValue ? `EV${formatExposure.ev(exposureValue)}` : "",
      lightValue ? `LV${formatExposure.ev(lightValue)}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    if (!parts) return null;
    return <Muted>{parts}</Muted>;
  };
  const renderGear = () => {
    const camera = photo.formatCamera();
    const lens = photo.formatLens();
    if (!camera && !lens) return null;
    if (!camera) return <Muted>{lens}</Muted>;
    if (!lens) return <Muted>{camera}</Muted>;
    return (
      <Muted>
        <Part>{camera}</Part> + <Part>{lens}</Part>
      </Muted>
    );
  };
  const renderEpochInfo = () => {
    if (!gallery.hasEpoch()) return null;
    switch (gallery.epochType()) {
      case "birthday":
        return (
          <Muted>
            <EpochAge
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              format="long"
              separator=" "
            />
          </Muted>
        );
      case "1-index":
        return (
          <Muted>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              format="long"
            />
          </Muted>
        );
      case "0-index":
        return (
          <Muted>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              format="long"
              start={0}
            />
          </Muted>
        );
      default:
        return null;
    }
  };
  const renderMap = () => {
    if (!photo.hasCoordinates() || gallery.hideMap()) return null;
    // Explicit height matches MapBox; without it MapContainer
    // defaults to 400px and the marker ends up below the 160px clip.
    return (
      <MapBox>
        <MapContainer positions={[photo]} height={160} />
      </MapBox>
    );
  };

  return (
    <Root role="dialog" aria-label={t("photo-metadata")}>
      <Header>
        <HeaderTitle>{t("photo-metadata")}</HeaderTitle>
        <CloseButton
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          title={t("close")}
        >
          <BsXLg />
        </CloseButton>
      </Header>
      <Body>
        {photo.title() && <Title>{photo.title()}</Title>}
        {renderLocation()}
        {renderCoordinates()}
        {renderExposure()}
        {renderGear()}
        {renderEpochInfo()}
        {renderMap()}
        <Copyright>
          Photo Copyright © {photo.author()}. All rights reserved.
        </Copyright>
      </Body>
    </Root>
  );
};
export default MetadataPanel;
