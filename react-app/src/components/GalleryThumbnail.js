import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import GalleryLink from "./GalleryLink";
import FlagIcon from "./FlagIcon";

import config from "../utils/config";

const registerCountryData = (i18n) => {
  var countryData = require("i18n-iso-countries");
  try {
    countryData.registerLocale(
      require("i18n-iso-countries/langs/" + i18n.language + ".json")
    );
  } catch (err) {
    // Fall back to English
    countryData.registerLocale(require("i18n-iso-countries/langs/en.json"));
  }
  return countryData;
};

const GalleryThumbnail = ({ gallery, photo }) => {
  const { i18n } = useTranslation();
  const url = `url("${config.PHOTO_ROOT}thumbnail/${photo.id}")`;
  const style = {
    width: `${photo.dimensions.thumbnail.width + 10}px`,
    height: `${photo.dimensions.thumbnail.height + 10}px`,
    backgroundImage: url,
  };
  var countryData = registerCountryData(i18n);
  return (
    <div className="thumbnail">
      <GalleryLink gallery={gallery} photo={photo}>
        <span className="thumbnail" style={style}>
          <img src="https://gallery.misaki.fi/css/blank.gif" alt="" />
        </span>
      </GalleryLink>
      {photo.taken.location.country ? (
        <span
          className="flag"
          title={countryData.getName(
            photo.taken.location.country,
            i18n.language
          )}
        >
          <FlagIcon code={photo.taken.location.country} />
        </span>
      ) : (
        ""
      )}
    </div>
  );
};
GalleryThumbnail.propTypes = {
  gallery: PropTypes.object.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryThumbnail;
