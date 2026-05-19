import React from "react";
import { Link as ReactLink } from "react-router-dom";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface Props {
  children: React.ReactNode;
  className?: string;
  gallery?: Gallery;
  year?: number;
  month?: number;
  day?: number;
  photo?: Photo;
  context?: string;
}

const Link = ({
  children,
  className,
  gallery,
  year,
  month,
  photo,
  day,
  context,
}: Props): React.ReactElement => {
  if (gallery && context === "stats") {
    return (
      <ReactLink className={className} to={gallery.statsPath()}>
        {children}
      </ReactLink>
    );
  }
  if (photo && gallery) {
    return (
      <ReactLink className={className} to={photo.path(gallery)}>
        {children}
      </ReactLink>
    );
  }
  if (!gallery) {
    return (
      <ReactLink className={className} to="/g">
        {children}
      </ReactLink>
    );
  }
  const path = gallery.path(year, month, day);
  return (
    <ReactLink className={className} to={path}>
      {children}
    </ReactLink>
  );
};

export default Link;
