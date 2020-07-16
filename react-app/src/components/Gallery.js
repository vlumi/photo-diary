import React from "react";
import { useParams } from "react-router-dom";

import galleryService from "../services/galleries";

import DumpPhotoNames from "./DumpPhotoNames";

const Gallery = () => {
  const [gallery, setGallery] = React.useState(undefined);

  const galleryId = useParams().galleryId;
  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);

  // TODO: check valid date...

  console.log("ymd", year, month, day);

  React.useEffect(() => {
    console.log("loading");
    galleryService.get(galleryId).then((loadedGallery) => {
      console.log("got gallery", loadedGallery);
      setGallery(loadedGallery);
    });
  }, [galleryId]);

  console.log("here", gallery);
  if (!gallery) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }

  return (
    <>
      <h2>{gallery.title}</h2>
      <DumpPhotoNames gallery={gallery} year={year} month={month} day={day} />
    </>
  );
};
export default Gallery;
