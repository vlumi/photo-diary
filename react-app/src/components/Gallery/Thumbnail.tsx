import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import FlagIcon from "../FlagIcon";

import Link from "./Link";

import config from "../../lib/config";
import { isCountrySentinel } from "../../lib/country-sentinel";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const Root = styled.div<{ $highlighted?: boolean }>`
  height: 212px;
  margin: 1px;
  background-color: ${({ $highlighted }) =>
    $highlighted
      ? "color-mix(in srgb, var(--primary-color) 70%, var(--photo-frame-mat))"
      : "var(--photo-frame-mat)"};
  text-align: left;
`;
const TN = styled.span`
  display: block;
  background-repeat: no-repeat;
  background-position: 5px 5px;
  border: solid var(--photo-frame-border) 1px;
  margin: 0;
  padding: 0;
  text-align: left;
`;
const Flag = styled.span`
  display: inline;
  position: relative;
  top: -19px;
  left: 3px;
`;
const StyledFlagIcon = styled(FlagIcon)`
  display: block;
`;

interface Props {
  gallery: Gallery;
  photo: Photo;
  lang: string;
  countryData: CountryData;
  highlighted?: boolean;
}

const Thumbnail = ({
  gallery,
  photo,
  lang,
  countryData,
  highlighted,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const url = `url("${config.PHOTO_ROOT_URL}thumbnail/${photo.id()}")`;
  const dimensions = photo.thumbnailDimensions();
  const style = {
    width: `${dimensions.width + 10}px`,
    height: `${dimensions.height + 10}px`,
    backgroundImage: url,
  };

  const renderFlag = () => {
    const countryCode = photo.countryCode();
    if (!photo.hasCountry() || !countryCode) return "";
    // No-country sentinel — render the localised label as a tooltip
    // but skip the flag icon (the sentinel isn't a real ISO code).
    if (isCountrySentinel(countryCode)) {
      return <Flag title={photo.countryName(lang, countryData, t)} />;
    }
    return (
      <Flag title={photo.countryName(lang, countryData, t)}>
        <StyledFlagIcon code={countryCode} />
      </Flag>
    );
  };
  return (
    <Root $highlighted={highlighted}>
      <Link gallery={gallery} photo={photo}>
        <TN style={style}></TN>
      </Link>
      {renderFlag()}
    </Root>
  );
};
export default Thumbnail;
