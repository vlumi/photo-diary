import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import FlagIcon from "../FlagIcon";

import Link from "./Link";

import config from "../../lib/config";

const Root = styled.div`
  height: 212px;
  margin: 1px;
  background-color: #bbb;
  text-align: left;
`;
const TN = styled.span`
  display: block;
  background-repeat: no-repeat;
  background-position: 5px 5px;
  border: solid #004 1px;
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

const Thumbnail = ({ gallery, photo, lang, countryData }) => {
  const url = `url("${config.PHOTO_ROOT_URL}thumbnail/${photo.id()}")`;
  const dimensions = photo.thumbnailDimensions();
  const style = {
    width: `${dimensions.width + 10}px`,
    height: `${dimensions.height + 10}px`,
    backgroundImage: url,
  };

  const renderFlag = () => {
    return photo.hasCountry() ? (
      <Flag title={photo.countryName(lang, countryData)}>
        <StyledFlagIcon code={photo.countryCode()} />
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
Thumbnail.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Thumbnail;
