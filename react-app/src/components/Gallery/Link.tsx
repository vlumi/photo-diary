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
  state?: Record<string, unknown>;
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
  state,
}: Props): React.ReactElement => {
  if (gallery && context === "stats") {
    return (
      <ReactLink className={className} to={gallery.statsPath()} state={state}>
        {children}
      </ReactLink>
    );
  }
  if (photo && gallery) {
    return (
      <ReactLink className={className} to={photo.path(gallery)} state={state}>
        {children}
      </ReactLink>
    );
  }
  if (!gallery) {
    return (
      <ReactLink className={className} to="/g" state={state}>
        {children}
      </ReactLink>
    );
  }
  const path = gallery.path(year, month, day);
  return (
    <ReactLink className={className} to={path} state={state}>
      {children}
    </ReactLink>
  );
};

export default Link;
