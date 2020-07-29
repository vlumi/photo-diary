import React from "react";
import PropTypes from "prop-types";

import FlagIcon from "../FlagIcon";

import Link from "./Link";

import config from "../../lib/config";

const Thumbnail = ({ gallery, photo, lang, countryData }) => {
  const url = `url("${config.PHOTO_ROOT_URL}thumbnail/${photo.id()}")`;
  const dimensions = photo.thumbnailDimensions();
  const style = {
    width: `${dimensions.width + 10}px`,
    height: `${dimensions.height + 10}px`,
    backgroundImage: url,
  };
  return (
    <div className="thumbnail">
      <Link gallery={gallery} photo={photo}>
        <span className="thumbnail" style={style}></span>
      </Link>
      {photo.hasCountry() ? (
        <span className="flag" title={photo.countryName(lang, countryData)}>
          <FlagIcon code={photo.countryCode()} />
        </span>
      ) : (
        ""
      )}
    </div>
  );
};
Thumbnail.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Thumbnail;
