import React from "react";
import { useParams } from "react-router-dom";

import galleryService from "../services/galleries";

import GalleryTitle from "./GalleryTitle";
import ViewFull from "./ViewFull";
import ViewYear from "./ViewYear";
import ViewMonth from "./ViewMonth";
import ViewDay from "./ViewDay";

import theme from "../utils/theme";
import GalleryPhoto from "./GalleryPhoto";

const Gallery = () => {
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
      setGallery(loadedGallery);
    });
  }, [galleryId]);

  if (!gallery) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }
  if (!("photos" in gallery)) {
    return <></>;
  }

  if (photoId) {
    if (
      !(year in gallery.photos) ||
      !(month in gallery.photos[year]) ||
      !(day in gallery.photos[year][month]) ||
      gallery.photos[year][month][day].includes(photoId)
    ) {
      return <></>;
    }
    const photo = gallery.photos[year][month][day].find(
      (photo) => photo.id === photoId
    );
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
      <GalleryTitle gallery={gallery} />
      {!year ? (
        <ViewFull gallery={gallery} />
      ) : !month ? (
        <ViewYear gallery={gallery} year={year} />
      ) : !day ? (
        <ViewMonth gallery={gallery} year={year} month={month} />
      ) : (
        <ViewDay gallery={gallery} year={year} month={month} day={day} />
      )}
    </>
  );
};
export default Gallery;
