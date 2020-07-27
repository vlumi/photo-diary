import React from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";

import galleryService from "../services/galleries";

import GalleryEmpty from "./GalleryEmpty";
import GalleryFull from "./GalleryFull";
import GalleryYear from "./GalleryYear";
import GalleryMonth from "./GalleryMonth";
import GalleryDay from "./GalleryDay";
import GalleryPhoto from "./GalleryPhoto";

import GalleryModel from "../models/Gallery";

import config from "../utils/config";
import theme from "../utils/theme";

const GalleryTop = ({ user, lang, countryData }) => {
  const [gallery, setGallery] = React.useState(undefined);
  const [error, setError] = React.useState("");

  if (gallery && gallery.hasTheme()) {
    theme.setTheme(gallery.theme());
  } else {
    theme.setTheme(config.DEFAULT_THEME);
  }

  const galleryId = useParams().galleryId;
  const photoId = useParams().photoId;

  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);

  React.useEffect(() => {
    galleryService
      .get(galleryId)
      .then((loadedGallery) => {
        const gallery = GalleryModel(loadedGallery);
        if (gallery.hasTheme()) {
          theme.setTheme(gallery.theme());
        }
        setGallery(gallery);
      })
      .catch((error) => setError(error.message));
  }, [galleryId, user]);

  if (error) {
    theme.setTheme("grayscale");
    return <div className="error">Loading failed</div>;
  }

  const renderContent = () => {
    if (!gallery) {
      return (
        <>
          <div>Loading...</div>
        </>
      );
    }
    if (!gallery.includesPhotos()) {
      return <GalleryEmpty gallery={gallery} />;
    }
    if (!year) {
      return <GalleryFull gallery={gallery} />;
    }
    if (!month) {
      return (
        <GalleryYear
          gallery={gallery}
          year={year}
          lang={lang}
          countryData={countryData}
        />
      );
    }
    if (!day) {
      return (
        <GalleryMonth
          gallery={gallery}
          year={year}
          month={month}
          lang={lang}
          countryData={countryData}
        />
      );
    }
    if (!photoId) {
      return (
        <GalleryDay
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          lang={lang}
          countryData={countryData}
        />
      );
    }
    const photo = gallery.photo(year, month, day, photoId);
    return (
      <GalleryPhoto
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
        lang={lang}
        countryData={countryData}
      />
    );
  };

  return <>{renderContent()}</>;
};
GalleryTop.propTypes = {
  user: PropTypes.object,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default GalleryTop;
