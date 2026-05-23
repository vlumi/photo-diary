import React from "react";
import styled from "@emotion/styled";

import FlagIcon from "../FlagIcon";

import Link from "./Link";

import config from "../../lib/config";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const Root = styled.div`
  height: 212px;
  margin: 1px;
  background-color: var(--inactive-color);
  text-align: left;
`;
const TN = styled.span`
  display: block;
  background-repeat: no-repeat;
  background-position: 5px 5px;
  border: solid var(--primary-color) 1px;
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
}

const Thumbnail = ({
  gallery,
  photo,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const url = `url("${config.PHOTO_ROOT_URL}thumbnail/${photo.id()}")`;
  const dimensions = photo.thumbnailDimensions();
  const style = {
    width: `${dimensions.width + 10}px`,
    height: `${dimensions.height + 10}px`,
    backgroundImage: url,
  };

  const renderFlag = () => {
    const countryCode = photo.countryCode();
    return photo.hasCountry() && countryCode ? (
      <Flag title={photo.countryName(lang, countryData)}>
        <StyledFlagIcon code={countryCode} />
      </Flag>
    ) : (
      ""
    );
  };
  return (
    <Root>
      <Link gallery={gallery} photo={photo}>
        <TN style={style}></TN>
      </Link>
      {renderFlag()}
    </Root>
  );
};
export default Thumbnail;
