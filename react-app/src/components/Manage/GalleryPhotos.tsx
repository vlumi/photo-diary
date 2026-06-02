import React from "react";
import { useParams } from "react-router-dom";

import Photos from "./Photos";

// Thin wrapper that locks the shared Photos view to a single gallery,
// for the /m/g/<galleryId>/photos route. The cross-gallery /m/photos
// route renders <Photos /> directly.
const GalleryPhotos = (): React.ReactElement => {
  const params = useParams();
  return <Photos galleryId={params.galleryId} />;
};

export default GalleryPhotos;
