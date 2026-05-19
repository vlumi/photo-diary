import React from "react";

import MapContainer from "../../MapContainer";
import Root from "../Footer";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

interface Props {
  gallery: Gallery;
  year: number;
}

const Footer = ({ gallery, year }: Props): React.ReactElement => {
  const renderMap = (positions: Photo[]) => {
    if (!positions || !positions.length) {
      return "";
    }
    return <MapContainer positions={positions} drawLine />;
  };

  const photos = gallery
    .flatMapMonths(year, (month) =>
      gallery.flatMapDays(year, month, (day) =>
        gallery.photos(year, month, day)
      )
    )
    .filter(Boolean)
    .filter((photo) => photo.hasCoordinates());
  return <Root>{renderMap(photos)}</Root>;
};
export default Footer;
