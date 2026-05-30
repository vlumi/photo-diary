import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { BsXLg } from "react-icons/bs";

import EpochAge from "../EpochAge";
import EpochDayIndex from "../EpochDayIndex";
import FlagIcon from "../../FlagIcon";
import MapContainer from "../../MapContainer.lazy";

import format from "../../../lib/format";
import { useBetaStore } from "../../../stores";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

// Floating panel anchored to the bottom-right, above the info
// toggle button. `bottom: 60px` = button bottom (16) + button
// diameter (34) + 10px gap.
const Root = styled.div`
  position: absolute;
  z-index: 9;
  right: 16px;
  bottom: 60px;
  width: min(360px, calc(100% - 32px));
  max-height: calc(100% - 140px);
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
  text-align: left;
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
// 2-col label-value grid. `min-width: 0` on the value cell so a
// long value (camera body / lens name) wraps in place instead of
// stretching the column past the panel width.
const ExifTable = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 10px;
  row-gap: 4px;
  margin-top: 10px;
`;
const RowLabel = styled.div`
  font-size: 0.7em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  padding-top: 2px;
  text-align: right;
`;
const RowValue = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85em;
  line-height: 1.4;
  word-break: break-word;
  min-width: 0;
`;
const Part = styled.span`
  display: inline;
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
  const beta = useBetaStore((s) => s.enabled.regions);
  const formatExposure = format.exposure(lang, t);

  // Operator place sits on its own row (no country / flag). Keeping
  // place inline with the geocoded address jumbles the CJK ordering
  // (place is most-specific, but ja geocoded reads broad → narrow,
  // so a prepended place would jump specific → broad → narrow).
  const renderOperatorPlace = () => {
    if (gallery.hideMap() || !photo.hasPlace()) return null;
    return <Row>{photo.place()}</Row>;
  };
  // Address row: geocoded city/state/country with locale-aware flag
  // position. Falls back to operator country name + flag when there's
  // no geocoded data (the prior non-geocoded photo path).
  const renderAddress = () => {
    if (gallery.hideMap()) return null;
    const geocodedAddress = photo.hasGeocodedAddress()
      ? photo.geocodedAddress(lang, countryData, { includeState: beta })
      : undefined;
    const operatorCountryName =
      !geocodedAddress && photo.hasCountry() && photo.countryCode()
        ? photo.countryName(lang, countryData)
        : undefined;
    const text = geocodedAddress ?? operatorCountryName;
    const code = photo.geocodedCountryCode() ?? photo.countryCode();
    if (!text && !code) return null;
    const flagAt = format.geocodedFlagPosition(lang);
    return (
      <Row>
        <Part>
          {code && flagAt === "start" ? (
            <>
              <FlagIcon code={code} />{" "}
            </>
          ) : null}
          {text}
          {code && flagAt === "end" ? (
            <>
              {" "}
              <FlagIcon code={code} />
            </>
          ) : null}
        </Part>
      </Row>
    );
  };
  const renderExif = () => {
    const camera = photo.formatCamera();
    const lens = photo.formatLens();
    const focalLength = photo.focalLength();
    const aperture = photo.aperture();
    const exposureTime = photo.exposureTime();
    const iso = photo.iso();
    const resolution = photo.resolution();
    const orientation = photo.orientation();
    const aspectRatio = photo.aspectRatio();
    const exposureValue = photo.exposureValue();
    const lightValue = photo.lightValue();
    const settingParts = [
      focalLength ? `${formatExposure.focalLength(focalLength)}㎜` : "",
      aperture ? formatExposure.aperture(aperture) : "",
      exposureTime ? `${formatExposure.exposureTime(exposureTime)}s` : "",
      iso ? `ISO${formatExposure.iso(iso)}` : "",
    ].filter(Boolean);
    const imageParts = [
      resolution ? `${formatExposure.resolution(resolution)}MP` : "",
      aspectRatio ? String(aspectRatio) : "",
      orientation ? `${formatExposure.orientation(orientation)}` : "",
    ].filter(Boolean);
    const lightParts = [
      exposureValue ? `EV${formatExposure.ev(exposureValue)}` : "",
      lightValue ? `LV${formatExposure.ev(lightValue)}` : "",
    ].filter(Boolean);
    const tableRows: Array<[string, string]> = [
      ...(camera ? ([[t("metadata-camera"), camera]] as Array<[string, string]>) : []),
      ...(lens ? ([[t("metadata-lens"), lens]] as Array<[string, string]>) : []),
      ...(settingParts.length > 0
        ? ([[t("metadata-settings"), settingParts.join(" · ")]] as Array<[string, string]>)
        : []),
      ...(imageParts.length > 0
        ? ([[t("metadata-image"), imageParts.join(" · ")]] as Array<[string, string]>)
        : []),
      ...(lightParts.length > 0
        ? ([[t("metadata-light"), lightParts.join(" · ")]] as Array<[string, string]>)
        : []),
    ];
    if (tableRows.length === 0) return null;
    return (
      <ExifTable>
        {tableRows.map(([label, value], i) => (
          <React.Fragment key={i}>
            <RowLabel>{label}</RowLabel>
            <RowValue>{value}</RowValue>
          </React.Fragment>
        ))}
      </ExifTable>
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
        {renderOperatorPlace()}
        {renderAddress()}
        {renderMap()}
        {renderExif()}
        {renderEpochInfo()}
      </Body>
    </Root>
  );
};
export default MetadataPanel;
