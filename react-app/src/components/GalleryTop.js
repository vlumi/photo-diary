import React from "react";
import { useParams } from "react-router-dom";

import galleryService from "../services/galleries";

import GalleryFull from "./GalleryFull";
import GalleryYear from "./GalleryYear";
import GalleryMonth from "./GalleryMonth";
import GalleryDay from "./GalleryDay";
import GalleryPhoto from "./GalleryPhoto";

import GalleryModel from "../models/Gallery";
import theme from "../utils/theme";

const GalleryTop = () => {
  const [gallery, setGallery] = React.useState(undefined);

  const galleryId = useParams().galleryId;
  const photoId = useParams().photoId;

  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);
  // TODO: validate ymd...

  React.useEffect(() => {
    galleryService.get(galleryId).then((loadedGallery) => {
      if (loadedGallery.theme) {
        theme.setTheme(loadedGallery.theme);
      }
      setGallery(GalleryModel(loadedGallery));
    });
  }, [galleryId]);

  if (!gallery) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }

  if (!gallery.includesPhotos()) {
    return <></>;
  }
  if (photoId) {
    const photo = gallery.photo(year, month, day, photoId);
    if (!photo) {
      return <></>;
    }
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
