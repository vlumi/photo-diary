import React from "react";
import { useParams } from "react-router-dom";

import galleryService from "../services/galleries";

import GalleryFull from "./GalleryFull";
import GalleryYear from "./GalleryYear";
import GalleryMonth from "./GalleryMonth";
import GalleryDay from "./GalleryDay";
import GalleryPhoto from "./GalleryPhoto";

import GalleryModel from "../models/Gallery";

import config from "../utils/config";
import theme from "../utils/theme";

const GalleryTop = () => {
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
  }, [galleryId]);

  if (error) {
    theme.setTheme("grayscale");
    return <div className="error">Loading failed</div>;
  }
  if (!gallery) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }

  if (!gallery.includesPhotos()) {
    return <i>Empty</i>;
  }
  if (photoId) {
    const photo = gallery.photo(year, month, day, photoId);
    return (
      <GalleryPhoto
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
      />
    );
  }
  return (
    <>
      {!year ? (
        <GalleryFull gallery={gallery} />
      ) : !month ? (
        <GalleryYear gallery={gallery} year={year} />
      ) : !day ? (
        <GalleryMonth gallery={gallery} year={year} month={month} />
      ) : (
        <GalleryDay gallery={gallery} year={year} month={month} day={day} />
      )}
    </>
  );
};
export default GalleryTop;
